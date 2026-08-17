"""
FastAPI backend for FL Sunbiz Leads self-service platform.

Endpoints:
- POST /sync - Update profile in profiles.json and cron
- POST /stripe-webhook - Handle Stripe payment events
- GET /health - Health check
- GET /profiles - List user's profiles
- POST /profiles - Create new profile
- DELETE /profiles/{id} - Delete profile

Auth: Firebase token verification + API key fallback
"""

import os
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Header, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import stripe

from . import db

# Configuration
API_KEY = os.environ.get("LEADS_API_KEY", "dev-key-change-me")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")

TOOLS_DIR = Path(__file__).parent.parent.parent
PROFILES_PATH = TOOLS_DIR / "config" / "profiles.json"
RUNNER_PATH = TOOLS_DIR / "src" / "runner.py"

# Initialize
stripe.api_key = STRIPE_SECRET_KEY
app = FastAPI(title="FL Sunbiz Leads API", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev
        "https://tools.ridgefield.llc",
        "https://leads.ridgefield.llc",
        "https://leads.mdo3d.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic models

class EmailMethodsConfig(BaseModel):
    use_apollo: bool = False
    use_godaddy: bool = True
    skip_domains: list[str] = Field(default_factory=list)
    verify_mx: bool = False
    verify_smtp: bool = False
    guess_email_variants: bool = True
    max_variant_attempts: int = 10


class DeliverySettings(BaseModel):
    frequency: str = "daily"  # daily, weekly, biweekly, monthly
    day_of_week: str = "monday"
    recipient_email: str
    recipient_name: str
    format: str = "csv_attachment"
    subject: str = "Lead Report - {date}"


class ProfileSettings(BaseModel):
    name: str
    email_lookup: bool = True
    email_methods: EmailMethodsConfig = Field(default_factory=EmailMethodsConfig)
    date_range: str = "daily"  # daily, weekly, monthly
    max_leads: int = 30
    filing_types: list[str] = Field(default_factory=lambda: ["FLAL", "DOMP", "FORP"])
    keywords: list[str] = Field(default_factory=list)
    exclude_keywords: list[str] = Field(default_factory=list)
    target_counties: Optional[list[str]] = None
    delivery: DeliverySettings
    sender: str = "leads@mdo3d.com"


class ProfileCreate(BaseModel):
    name: str
    settings: ProfileSettings


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[ProfileSettings] = None
    active: Optional[bool] = None


class SyncRequest(BaseModel):
    profile_id: str
    data: ProfileSettings


class CheckoutRequest(BaseModel):
    profile_id: str
    price_id: str  # Stripe price ID
    success_url: str
    cancel_url: str


class RedeemCodeRequest(BaseModel):
    profile_id: str
    code: str


# Auth dependencies

async def verify_api_key(x_api_key: str = Header(None)) -> bool:
    """Verify API key for internal/admin requests."""
    if not x_api_key or x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


async def verify_firebase_token(authorization: str = Header(None)) -> dict:
    """Verify Firebase ID token and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.split(" ")[1]

    try:
        import firebase_admin
        from firebase_admin import auth, credentials

        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            if os.path.exists("/etc/secrets/firebase-credentials.json"):
                cred = credentials.Certificate("/etc/secrets/firebase-credentials.json")
            else:
                # Use application default credentials
                cred = credentials.ApplicationDefault()
            firebase_admin.initialize_app(cred, {
                'projectId': FIREBASE_PROJECT_ID
            })

        decoded = auth.verify_id_token(token)
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email", ""),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")


async def get_or_create_user(user_info: dict = Depends(verify_firebase_token)) -> db.User:
    """Get existing user or create new one from Firebase auth."""
    user = db.get_user_by_firebase_uid(user_info["uid"])
    if not user:
        user = db.create_user(user_info["uid"], user_info["email"])
    return user


# Cron management

DAY_MAP = {"monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6, "sunday": 0}


def build_cron_schedule(settings: dict) -> str:
    """Build cron schedule string from profile settings."""
    delivery = settings.get("delivery", {})
    frequency = delivery.get("frequency", "daily")
    day = delivery.get("day_of_week", "monday").lower()

    if frequency == "daily":
        return "0 8 * * 1-5"  # 8am Mon-Fri
    elif frequency == "weekly":
        day_num = DAY_MAP.get(day, 1)
        return f"0 8 * * {day_num}"
    elif frequency == "biweekly":
        day_num = DAY_MAP.get(day, 1)
        return f"0 8 1-7,15-21 * {day_num}"  # 1st and 3rd week
    elif frequency == "monthly":
        return "0 8 1 * *"  # 1st of month
    return "0 8 * * 1"  # Default: Monday 8am


def update_cron_entry(profile_id: str, settings: dict = None, remove: bool = False):
    """Update cron entry for a specific profile using marker comments."""
    marker = f"LEADS:{profile_id}"

    # Read current crontab
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if result.returncode != 0:
        current_lines = []
    else:
        current_lines = result.stdout.strip().split("\n")

    # Remove existing entry for this profile
    new_lines = [line for line in current_lines if marker not in line and line.strip()]

    # Add new entry if not removing and settings provided
    if not remove and settings:
        schedule = build_cron_schedule(settings)
        cmd = f"cd {TOOLS_DIR.resolve()} && .venv/bin/python src/runner.py --profile {profile_id}"
        log_path = f"logs/customer_{profile_id}.log"
        entry = f"{schedule} {cmd} >> {log_path} 2>&1 # {marker}"
        new_lines.append(entry)

    # Write back crontab
    new_crontab = "\n".join(new_lines) + "\n" if new_lines else ""
    subprocess.run(["crontab", "-"], input=new_crontab, text=True, check=True)


# Endpoints

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    apollo_key = os.environ.get("APOLLO_API_KEY", "")
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "profiles_path": str(PROFILES_PATH),
        "profiles_exists": PROFILES_PATH.exists(),
        "apollo_configured": bool(apollo_key),
    }


@app.get("/validate-apollo")
async def validate_apollo_key(
    _: bool = Depends(verify_api_key)
):
    """Validate Apollo API key by making a test request."""
    import requests
    
    apollo_key = os.environ.get("APOLLO_API_KEY", "")
    if not apollo_key:
        return {"valid": False, "error": "APOLLO_API_KEY not configured"}
    
    try:
        url = "https://api.apollo.io/api/v1/people/match"
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": apollo_key
        }
        payload = {"q_organization_name": "Test Company"}
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            return {"valid": True, "message": "API key is working"}
        else:
            return {"valid": False, "error": f"HTTP {resp.status_code}: {resp.text[:100]}"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


@app.get("/profiles")
async def list_profiles(user: db.User = Depends(get_or_create_user)):
    """List all profiles for authenticated user."""
    profiles = db.get_profiles_by_user(user.id)
    return {
        "profiles": [
            {
                "id": p.id,
                "name": p.name,
                "active": p.active,
                "paid": p.paid,
                "settings": p.settings,
                "created_at": p.created_at,
            }
            for p in profiles
        ]
    }


@app.post("/profiles")
async def create_profile(
    request: ProfileCreate,
    user: db.User = Depends(get_or_create_user)
):
    """Create a new profile for authenticated user."""
    profile_id = str(uuid4())[:12]

    settings_dict = request.settings.model_dump()
    profile = db.create_profile(
        profile_id=profile_id,
        user_id=user.id,
        name=request.name,
        settings=settings_dict
    )

    return {
        "id": profile.id,
        "name": profile.name,
        "active": profile.active,
        "paid": profile.paid,
        "message": "Profile created. Complete payment to activate.",
    }


@app.get("/profiles/{profile_id}")
async def get_profile(
    profile_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Get a specific profile."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    return {
        "id": profile.id,
        "name": profile.name,
        "active": profile.active,
        "paid": profile.paid,
        "settings": profile.settings,
        "created_at": profile.created_at,
    }


@app.put("/profiles/{profile_id}")
async def update_profile_endpoint(
    profile_id: str,
    request: ProfileUpdate,
    user: db.User = Depends(get_or_create_user)
):
    """Update a profile."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    settings_dict = request.settings.model_dump() if request.settings else None

    db.update_profile(
        profile_id=profile_id,
        name=request.name,
        settings=settings_dict,
        active=request.active
    )

    # Manage cron based on profile state
    updated = db.get_profile(profile_id)
    if updated.paid and updated.active:
        update_cron_entry(profile_id, updated.settings)
    else:
        # Remove cron when profile is deactivated or unpaid
        update_cron_entry(profile_id, remove=True)

    return {"ok": True, "message": "Profile updated"}


@app.delete("/profiles/{profile_id}")
async def delete_profile_endpoint(
    profile_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Delete a profile."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    # Remove from cron
    update_cron_entry(profile_id, remove=True)

    # Delete from database
    db.delete_profile(profile_id)

    return {"ok": True, "message": "Profile deleted"}


@app.post("/sync")
async def sync_profile(
    request: SyncRequest,
    _: bool = Depends(verify_api_key)
):
    """
    Sync profile settings and update cron.
    Called after successful payment or profile update.
    Database is the source of truth - profiles.json is deprecated.
    """
    profile = db.get_profile(request.profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if not profile.paid:
        raise HTTPException(status_code=400, detail="Profile not paid")

    settings_dict = request.data.model_dump()

    # Update database
    db.update_profile(request.profile_id, settings=settings_dict, active=True)

    # Update cron
    update_cron_entry(request.profile_id, settings_dict)

    return {"ok": True, "message": "Profile synced"}


@app.post("/checkout")
async def create_checkout_session(
    request: CheckoutRequest,
    user: db.User = Depends(get_or_create_user)
):
    """Create Stripe Checkout session for profile payment."""
    profile = db.get_profile(request.profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.paid:
        raise HTTPException(status_code=400, detail="Profile already paid")

    try:
        # Create or get Stripe customer
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={"firebase_uid": user.firebase_uid}
            )
            db.update_user_stripe_customer(user.id, customer.id)
            customer_id = customer.id
        else:
            customer_id = user.stripe_customer_id

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            line_items=[{"price": request.price_id, "quantity": 1}],
            mode="subscription",  # or "payment" for one-time
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "profile_id": request.profile_id,
                "user_id": str(user.id),
            }
        )

        # Record pending payment
        db.create_payment(
            user_id=user.id,
            profile_id=request.profile_id,
            stripe_session_id=session.id,
            amount_cents=0,  # Will be updated from webhook
            currency="usd"
        )

        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/redeem-code")
async def redeem_code(
    request: RedeemCodeRequest,
    user: db.User = Depends(get_or_create_user)
):
    """Redeem an access code to activate a profile without payment."""
    profile = db.get_profile(request.profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.paid:
        return {"ok": True, "message": "Profile already activated"}

    success, message = db.redeem_code(request.code, request.profile_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {"ok": True, "message": message}


@app.post("/profiles/{profile_id}/run")
async def run_pipeline(
    profile_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Trigger pipeline run for a profile."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not profile.paid:
        raise HTTPException(status_code=400, detail="Profile not paid")
    if not profile.active:
        raise HTTPException(status_code=400, detail="Profile not active")

    # Run pipeline in background subprocess
    venv_python = TOOLS_DIR / ".venv" / "bin" / "python"
    cmd = [
        str(venv_python),
        str(RUNNER_PATH),
        "--profile", f"customer_{profile_id}",
        "--force"
    ]
    subprocess.Popen(cmd, cwd=TOOLS_DIR)

    return {"ok": True, "message": "Pipeline started"}


@app.get("/profiles/{profile_id}/leads")
async def get_profile_leads(
    profile_id: str,
    limit: int = 50,
    offset: int = 0,
    user: db.User = Depends(get_or_create_user)
):
    """Get leads for a profile with pagination."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    leads = db.get_leads_by_profile(profile_id, limit, offset)
    total = db.get_leads_count(profile_id)

    return {
        "leads": [
            {
                "id": lead.id,
                "doc_number": lead.doc_number,
                "corp_name": lead.corp_name,
                "filing_type": lead.filing_type,
                "address": lead.address,
                "city": lead.city,
                "state": lead.state,
                "zip_code": lead.zip_code,
                "file_date": lead.file_date,
                "registered_agent": lead.registered_agent,
                "email_1": lead.email_1,
                "email_1_score": lead.email_1_score,
                "email_2": lead.email_2,
                "email_2_score": lead.email_2_score,
                "website_found": lead.website_found,
                "source_date": lead.source_date,
                "created_at": lead.created_at,
            }
            for lead in leads
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@app.get("/profiles/{profile_id}/stats")
async def get_profile_stats(
    profile_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Get lead statistics for dashboard."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    stats = db.get_leads_stats(profile_id)
    return stats


@app.post("/stripe-webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle checkout completion
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        profile_id = session.get("metadata", {}).get("profile_id")

        if profile_id:
            # Mark payment complete and activate profile
            db.complete_payment(
                stripe_session_id=session["id"],
                stripe_payment_intent=session.get("payment_intent")
            )

            # Set up cron for the activated profile
            profile = db.get_profile(profile_id)
            if profile:
                update_cron_entry(profile_id, profile.settings)

    elif event["type"] == "customer.subscription.deleted":
        # Handle subscription cancellation
        subscription = event["data"]["object"]
        # Mark profile as inactive
        # (would need to track subscription_id -> profile_id mapping)
        pass

    return {"received": True}


# Initialize database on startup
@app.on_event("startup")
async def startup():
    db.init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)
