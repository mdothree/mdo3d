"""
FastAPI backend for the MDO3D per-state business-filings leads product (leads.mdo3d.com).

Paid-only: there is no free tier. Filing search/export requires an entitlement — at least one
profile marked paid by a completed Stripe checkout (webhook) or a redeemed promo code (the
early-access lever). Without one the API refuses (fails closed).

Endpoints:
- GET /coverage - public: per-state filing counts + freshness (no filing content)
- GET /verticals - public: keyword verticals for search
- GET /filings - search filings (state, county, filing_type, entity_kind, vertical, q, date range)
- GET /filings/export.csv - same filters, CSV download
- POST /sync - Update profile in profiles.json and cron
- POST /stripe-webhook - Handle Stripe payment events
- GET /health - Health check
- GET /profiles - List user's profiles
- POST /profiles - Create new profile
- DELETE /profiles/{id} - Delete profile
- POST /profiles/{id}/run - Queue a manual run (202 + run id; executed by the scheduler container)
- GET /runs/{id} - Manual run status
- GET /filing-types?state=XX - public: filing-type codes + labels for a state
- GET /v1/account - signed-in user's plan status (account level)
- POST /v1/access/redeem - redeem a promo code for the account (no profile, no email scheduled)
- POST /v1/checkout - Stripe Checkout for the configured plan (off unless LEADS_CHECKOUT_ENABLED=1)
- GET/POST /v1/saved-searches, DELETE /v1/saved-searches/{id} - saved filter sets (weekly email only
  when LEADS_ENABLE_DELIVERY=1)

Auth: Firebase token verification + API key fallback
"""

import csv
import hmac
import io
import json
import os
import shutil
import subprocess
import threading
import time
from urllib.parse import urlparse
from pathlib import Path
from datetime import datetime
from typing import Literal, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Header, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
import stripe

from . import db
from . import filing_types as filing_types_mod
from . import verticals as verticals_mod

# Configuration
# No default: an unset LEADS_API_KEY disables the API-key routes instead of
# accepting a well-known placeholder.
API_KEY = os.environ.get("LEADS_API_KEY", "")
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FIREBASE_PROJECT_ID = os.environ.get("FIREBASE_PROJECT_ID", "")
FIREBASE_CREDENTIALS_PATH = os.environ.get(
    "FIREBASE_CREDENTIALS_PATH", "/etc/secrets/firebase-credentials.json"
)
# Optional allowlist (comma-separated) of Stripe price IDs this API may sell.
# Set it in production: the Stripe account sells other products too.
ALLOWED_PRICE_IDS = {
    p.strip() for p in os.environ.get("LEADS_STRIPE_PRICE_IDS", "").split(",") if p.strip()
}



def _env_flag(name: str) -> bool:
    return os.environ.get(name, "0").strip() == "1"


def _env_states(name: str, default: str) -> list[str]:
    return sorted({s.strip().upper() for s in os.environ.get(name, default).split(",") if s.strip()})


# Account-level plan settings are read per request, so an env change takes effect on restart without
# code changes and tests can set them with monkeypatch.setenv.
#   LEADS_CHECKOUT_ENABLED=1   open /v1/checkout (default off -> 503 "Plans opening soon")
#   LEADS_STRIPE_PRICE_ID      the one price /v1/checkout sells (the client never sends a price id)
#   LEADS_PLAN_NAME            label shown on the plan page (optional)
#   LEADS_PLAN_STATES          states a Stripe plan covers (default FL,CO,CT)
#   LEADS_PROMO_STATES         states a promo code grants (default FL,CO,CT)
#   LEADS_PROMO_ACCESS_DAYS    promo access length in days (default 0 = no end date)
#   LEADS_PROMO_ENABLED        0 turns promo redemption off (default on)
#   LEADS_ENABLE_DELIVERY=1    saved-search weekly email (and profile delivery) actually sends
DEFAULT_BUNDLE = "FL,CO,CT"  # the states with an adapter (matches LEADS_INGEST_STATES' default)


def checkout_enabled() -> bool:
    return (_env_flag("LEADS_CHECKOUT_ENABLED") and bool(os.environ.get("LEADS_STRIPE_PRICE_ID", "").strip())
            and bool(STRIPE_SECRET_KEY))


def delivery_enabled() -> bool:
    return _env_flag("LEADS_ENABLE_DELIVERY")


def promo_enabled() -> bool:
    return os.environ.get("LEADS_PROMO_ENABLED", "1").strip() != "0"


def _is_live_key(key: str) -> bool:
    return key.startswith(("sk_live_", "rk_live_"))


TOOLS_DIR = Path(__file__).parent.parent.parent
PROFILES_PATH = TOOLS_DIR / "config" / "profiles.json"

# Test runs must never reach live Stripe: under LEADS_TEST_MODE a live key is refused outright.
if os.environ.get("LEADS_TEST_MODE") and STRIPE_SECRET_KEY.startswith(("sk_live_", "rk_live_")):
    raise RuntimeError("LEADS_TEST_MODE is set but STRIPE_SECRET_KEY is a LIVE key; refusing to start")

# Initialize
stripe.api_key = STRIPE_SECRET_KEY
app = FastAPI(title="MDO3D Leads API", version="1.1.0")

# CORS for frontend (extra origins via LEADS_CORS_ORIGINS, comma-separated)
CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3050",
    "http://localhost:5173",  # Vite dev
    "https://leads.mdo3d.com",
] + [o.strip() for o in os.environ.get("LEADS_CORS_ORIGINS", "").split(",") if o.strip()]

EXPORT_MAX_ROWS = int(os.environ.get("LEADS_EXPORT_MAX_ROWS", "10000"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Let the browser read the CSV export's row count / truncation flag / filename.
    expose_headers=["X-Total-Count", "X-Truncated", "Content-Disposition"],
)


# Pydantic models

class EmailMethodsConfig(BaseModel):
    use_apollo: bool = False
    use_godaddy: bool = True
    skip_domains: list[str] = Field(default_factory=list)
    verify_mx: bool = False
    verify_smtp: bool = False
    guess_email_variants: bool = False  # removed by policy (never guess emails); always stored False
    max_variant_attempts: int = 10

    @field_validator("guess_email_variants", mode="before")
    @classmethod
    def _never_guess(cls, v):
        return False


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
    states: Optional[list[str]] = None  # state bundle; None = FL (original product)
    entity_kinds: Optional[list[str]] = None
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


class AccessRedeemRequest(BaseModel):
    code: str = Field(..., max_length=64)


class AccountCheckoutRequest(BaseModel):
    success_url: str = Field(..., max_length=500)
    cancel_url: str = Field(..., max_length=500)


SAVED_QUERY_KEYS = ("state", "county", "filing_type", "entity_kind", "vertical", "q", "date_from", "date_to",
                    "include_inactive")
SAVED_SEARCH_MAX_PER_USER = int(os.environ.get("LEADS_SAVED_SEARCH_MAX", "25"))


class SavedSearchCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    query: dict = Field(default_factory=dict)
    cadence: Literal["weekly"] = "weekly"


# Auth dependencies

async def verify_api_key(x_api_key: str = Header(None)) -> bool:
    """Verify API key for internal/admin requests."""
    if not API_KEY or not x_api_key or not hmac.compare_digest(x_api_key, API_KEY):
        raise HTTPException(status_code=401, detail="Invalid API key")
    return True


_firebase_app = None


def _get_firebase_app():
    """Initialise firebase-admin exactly once (service account file, else ADC)."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app
    import firebase_admin
    from firebase_admin import credentials

    if firebase_admin._apps:
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    if os.path.exists(FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
    else:
        cred = credentials.ApplicationDefault()
    _firebase_app = firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID})
    return _firebase_app


async def verify_firebase_token(authorization: str = Header(None)) -> dict:
    """Verify Firebase ID token and return user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")

    token = authorization.split(" ", 1)[1].strip()

    try:
        from firebase_admin import auth

        decoded = auth.verify_id_token(token, app=_get_firebase_app())
    except Exception:
        # Don't echo verification internals back to the caller.
        raise HTTPException(status_code=401, detail="Invalid token")

    # mdo3d-leads also hosts resume-analyzer, which uses anonymous auth; an
    # anonymous token must not be able to create a leads account.
    if decoded.get("firebase", {}).get("sign_in_provider") == "anonymous":
        raise HTTPException(status_code=401, detail="Sign in with email or Google")

    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", ""),
    }


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

    # In the container deployment there is no crontab: the scheduler container runs every active,
    # paid profile from the database (runner.py with no --profile), so nothing to do here.
    if shutil.which("crontab") is None:
        return

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
    """Health check endpoint (also used by the container healthcheck)."""
    apollo_key = os.environ.get("APOLLO_API_KEY", "")
    try:
        runs = db.latest_ingest_runs(limit=10)
        db_ok = True
    except Exception:
        runs, db_ok = [], False
    return {
        "status": "healthy" if db_ok else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "db_ok": db_ok,
        "profiles_exists": PROFILES_PATH.exists(),
        "apollo_configured": bool(apollo_key),
        "stripe_mode": ("live" if STRIPE_SECRET_KEY.startswith(("sk_live_", "rk_live_"))
                        else "test" if STRIPE_SECRET_KEY.startswith(("sk_test_", "rk_test_")) else "unset"),
        "checkout_enabled": checkout_enabled(),
        "delivery_enabled": delivery_enabled(),
        "latest_ingest_runs": runs,
    }


# ---------------------------------------------------------------------------
# Filings search (paid-only)
# ---------------------------------------------------------------------------

@app.get("/coverage")
async def coverage():
    """Public: which states have data, how many filings, and how fresh. No filing content."""
    return {"states": db.filings_coverage()}


@app.get("/verticals")
async def list_verticals():
    return {
        "verticals": [
            {"id": k, "label": v["label"], "match": "entity type" if v.get("entity_kind") else "name contains"}
            for k, v in verticals_mod.VERTICALS.items()
        ]
    }


@app.get("/filing-types")
async def list_filing_types(state: str = Query(..., description="Two-letter state code, e.g. FL")):
    """Public reference data: a state's filing-type codes, labels, entity kinds and stored counts."""
    st = state.strip().upper()
    if len(st) != 2 or not st.isalpha():
        raise HTTPException(status_code=422, detail="state must be a two-letter code")
    return {"state": st, "filing_types": filing_types_mod.for_state(st, db.filing_type_counts(st))}


async def require_entitlement(user: db.User = Depends(get_or_create_user)) -> tuple[db.User, set]:
    """Fail closed: no paid profile (Stripe or promo code) -> 402."""
    states = db.entitled_states(user.id)
    if not states:
        raise HTTPException(
            status_code=402,
            detail="An active subscription or early-access code is required to search filings.",
        )
    return user, states


def _date_param(value: Optional[str], name: str) -> Optional[str]:
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%Y%m%d"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    raise HTTPException(status_code=422, detail=f"{name} must be YYYY-MM-DD")


def _filing_filters(entitled: set, state, county, filing_type, entity_kind, vertical, q, date_from, date_to,
                    include_inactive) -> dict:
    if state:
        wanted = {s.strip().upper() for s in state.split(",") if s.strip()}
        not_entitled = wanted - entitled
        if not_entitled:
            raise HTTPException(status_code=403, detail=f"Not subscribed to: {', '.join(sorted(not_entitled))}")
        states = sorted(wanted)
    else:
        states = sorted(entitled)
    try:
        keywords, vertical_kind = verticals_mod.resolve(vertical)
    except KeyError:
        raise HTTPException(status_code=422, detail=f"Unknown vertical {vertical!r}")
    filters = {
        "states": states,
        "county": county,
        "filing_type": filing_type,
        "entity_kind": entity_kind or vertical_kind,
        "keywords": keywords or None,     # vertical: name contains ANY of these
        "must_contain": (q or "").strip() or None,  # q: name contains this (AND)
        "date_from": _date_param(date_from, "date_from"),
        "date_to": _date_param(date_to, "date_to"),
        "active_only": not include_inactive,
    }
    return filters


@app.get("/filings")
async def search_filings(
    state: Optional[str] = Query(None, description="Comma-separated state codes, e.g. FL,CO,CT"),
    county: Optional[str] = None,
    filing_type: Optional[str] = Query(None, description="State filing-type codes, comma-separated"),
    entity_kind: Optional[str] = Query(None, description="llc,corporation,nonprofit,partnership,..."),
    vertical: Optional[str] = None,
    q: Optional[str] = Query(None, description="Entity name contains"),
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_inactive: bool = False,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ent: tuple = Depends(require_entitlement),
):
    _, entitled = ent
    filters = _filing_filters(entitled, state, county, filing_type, entity_kind, vertical, q,
                              date_from, date_to, include_inactive)
    rows, total = db.search_filings(limit=limit, offset=offset, **filters)
    return {"filings": rows, "total": total, "limit": limit, "offset": offset,
            "states": filters["states"]}


CSV_FIELDS = [
    "state", "source_id", "entity", "filing_type", "entity_kind", "filed_date", "status", "county",
    "registered_agent", "address_1", "address_2", "city", "address_state", "zip_code", "source_date",
]


@app.get("/filings/export.csv")
async def export_filings_csv(
    state: Optional[str] = None,
    county: Optional[str] = None,
    filing_type: Optional[str] = None,
    entity_kind: Optional[str] = None,
    vertical: Optional[str] = None,
    q: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    include_inactive: bool = False,
    ent: tuple = Depends(require_entitlement),
):
    _, entitled = ent
    filters = _filing_filters(entitled, state, county, filing_type, entity_kind, vertical, q,
                              date_from, date_to, include_inactive)
    rows, total = db.search_filings(limit=EXPORT_MAX_ROWS, offset=0, **filters)
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=CSV_FIELDS, extrasaction="ignore")
    w.writeheader()
    w.writerows(rows)
    name = f"filings_{'-'.join(filters['states'])}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    headers = {
        "Content-Disposition": f'attachment; filename="{name}"',
        "X-Total-Count": str(total),
        "X-Truncated": "1" if total > len(rows) else "0",
    }
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers=headers)


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
    """Create Stripe Checkout session for profile payment (legacy per-profile flow)."""
    if _is_live_key(STRIPE_SECRET_KEY) and not _env_flag("LEADS_CHECKOUT_ENABLED"):
        raise HTTPException(status_code=503, detail="Plans opening soon")
    profile = db.get_profile(request.profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.paid:
        raise HTTPException(status_code=400, detail="Profile already paid")

    if ALLOWED_PRICE_IDS and request.price_id not in ALLOWED_PRICE_IDS:
        raise HTTPException(status_code=400, detail="Unknown price")
    for url in (request.success_url, request.cancel_url):
        u = urlparse(url)
        if f"{u.scheme}://{u.netloc}" not in CORS_ORIGINS:
            raise HTTPException(status_code=400, detail="Redirect URL not allowed")

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

    _check_redeem_rate(user.id)
    success, message = db.redeem_code(request.code, request.profile_id)
    if not success:
        _note_redeem_failure(user.id)
        raise HTTPException(status_code=400, detail=message)

    return {"ok": True, "message": message}


# ---------------------------------------------------------------------------
# Account level (v1): plan status, promo redemption, checkout, saved searches
# ---------------------------------------------------------------------------

REDEEM_MAX_FAILURES = int(os.environ.get("LEADS_REDEEM_MAX_FAILURES", "10"))  # per user per hour
_redeem_failures: dict[int, list[float]] = {}
_redeem_lock = threading.Lock()


def _check_redeem_rate(user_id: int):
    now = time.monotonic()
    with _redeem_lock:
        recent = [t for t in _redeem_failures.get(user_id, []) if now - t < 3600]
        _redeem_failures[user_id] = recent
        if len(recent) >= REDEEM_MAX_FAILURES:
            retry = max(1, int(3600 - (now - recent[0])))
            raise HTTPException(status_code=429, detail="Too many attempts; try again later.",
                                headers={"Retry-After": str(retry)})


def _note_redeem_failure(user_id: int):
    with _redeem_lock:
        _redeem_failures.setdefault(user_id, []).append(time.monotonic())


def _plan_view(user: db.User) -> dict:
    states = sorted(db.entitled_states(user.id))
    grants = db.active_account_access(user.id)
    plan = {"active": bool(states), "name": None, "source": None, "states": states,
            "renews_at": None, "expires_at": None}
    if grants:
        g = grants[0]
        plan.update(source=g["source"], name=g.get("plan_name"), renews_at=g.get("renews_at"),
                    expires_at=g.get("expires_at"))
    elif states:
        plan["source"] = db.paid_profile_source(user.id)
    return plan


@app.get("/v1/account")
async def get_account(user: db.User = Depends(get_or_create_user)):
    """The signed-in user's own plan status. No PII beyond the user's own email."""
    return {
        "email": user.email or None,
        "plan": _plan_view(user),
        "features": {
            "checkout": checkout_enabled(),
            "saved_searches": True,
            "saved_search_email": delivery_enabled(),
            "promo_codes": promo_enabled(),
        },
    }


@app.post("/v1/access/redeem")
async def redeem_access(request: AccessRedeemRequest, user: db.User = Depends(get_or_create_user)):
    """Redeem an early-access promo code for the account. Creates no profile and schedules no email."""
    if not promo_enabled():
        raise HTTPException(status_code=503, detail="Promo codes are not being accepted right now.")
    if db.entitled_states(user.id):
        return {"ok": True, "message": "Your access is already active. The code was not used."}
    _check_redeem_rate(user.id)
    try:
        days = int(os.environ.get("LEADS_PROMO_ACCESS_DAYS", "0") or 0)
    except ValueError:
        days = 0
    ok, message = db.redeem_code_for_account(request.code, user.id, _env_states("LEADS_PROMO_STATES", DEFAULT_BUNDLE),
                                             access_days=days)
    if not ok:
        _note_redeem_failure(user.id)
        raise HTTPException(status_code=400, detail=message)
    return {"ok": True, "message": message}


@app.post("/v1/checkout")
async def create_account_checkout(request: AccountCheckoutRequest, user: db.User = Depends(get_or_create_user)):
    """Stripe Checkout for the configured plan. The price comes from LEADS_STRIPE_PRICE_ID, never the client.

    Off unless LEADS_CHECKOUT_ENABLED=1 (503 "Plans opening soon"), so a live key is never used by default.
    """
    if not checkout_enabled():
        raise HTTPException(status_code=503, detail="Plans opening soon")
    if db.entitled_states(user.id):
        raise HTTPException(status_code=409, detail="Your plan is already active.")
    for url in (request.success_url, request.cancel_url):
        u = urlparse(url)
        if f"{u.scheme}://{u.netloc}" not in CORS_ORIGINS:
            raise HTTPException(status_code=400, detail="Redirect URL not allowed")

    price_id = os.environ["LEADS_STRIPE_PRICE_ID"].strip()
    states = _env_states("LEADS_PLAN_STATES", DEFAULT_BUNDLE)
    plan_name = os.environ.get("LEADS_PLAN_NAME", "").strip() or None
    try:
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(email=user.email, metadata={"firebase_uid": user.firebase_uid})
            db.update_user_stripe_customer(user.id, customer.id)
            customer_id = customer.id
        else:
            customer_id = user.stripe_customer_id
        session = stripe.checkout.Session.create(
            customer=customer_id,
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            client_reference_id=str(user.id),
            metadata={"purpose": "account", "user_id": str(user.id), "states": ",".join(states)},
            subscription_data={"metadata": {"purpose": "account", "user_id": str(user.id)}},
        )
    except stripe.StripeError:
        raise HTTPException(status_code=502, detail="Checkout is not available right now. You were not charged.")
    db.create_pending_checkout(user.id, session.id, states, plan_name)
    return {"checkout_url": session.url, "session_id": session.id}


def _saved_view(s: dict) -> dict:
    return {k: s.get(k) for k in db.SAVED_SEARCH_FIELDS}


def _email_status() -> str:
    return "enabled" if delivery_enabled() else "disabled"


@app.get("/v1/saved-searches")
async def list_saved_searches(user: db.User = Depends(get_or_create_user)):
    return {"saved_searches": [_saved_view(s) for s in db.list_saved_searches(user.id)], "email": _email_status()}


@app.post("/v1/saved-searches")
async def create_saved_search(request: SavedSearchCreate, ent: tuple = Depends(require_entitlement)):
    """Save a filter set. The weekly email of new matches is sent only when LEADS_ENABLE_DELIVERY=1."""
    user, entitled = ent
    q = {k: v for k, v in (request.query or {}).items() if k not in ("limit", "offset")}
    unknown = sorted(set(q) - set(SAVED_QUERY_KEYS))
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown filter(s): {', '.join(unknown)}")
    for k, v in q.items():
        if k == "include_inactive":
            if not isinstance(v, bool):
                raise HTTPException(status_code=422, detail="include_inactive must be true or false")
        elif v is not None and (not isinstance(v, str) or len(v) > 200):
            raise HTTPException(status_code=422, detail=f"{k} must be a short string")
    q = {k: v for k, v in q.items() if v not in (None, "")}
    if db.count_saved_searches(user.id) >= SAVED_SEARCH_MAX_PER_USER:
        raise HTTPException(status_code=400, detail=f"You can keep up to {SAVED_SEARCH_MAX_PER_USER} saved searches.")
    filters = _filing_filters(entitled, q.get("state"), q.get("county"), q.get("filing_type"), q.get("entity_kind"),
                              q.get("vertical"), q.get("q"), q.get("date_from"), q.get("date_to"),
                              bool(q.get("include_inactive")))
    # The weekly email covers filings first seen since the previous run, so the date range and the
    # state list are applied at send time (states re-checked against the plan then).
    stored = {k: filters[k] for k in ("county", "filing_type", "entity_kind", "keywords", "must_contain",
                                       "active_only")}
    if q.get("state"):
        q["state"] = ",".join(filters["states"])
    saved = db.create_saved_search(user.id, request.name.strip(), q, stored, request.cadence)
    return {**_saved_view(saved), "email": _email_status()}


@app.delete("/v1/saved-searches/{search_id}")
async def delete_saved_search(search_id: str, user: db.User = Depends(get_or_create_user)):
    if not db.delete_saved_search(search_id, user.id):
        raise HTTPException(status_code=404, detail="Saved search not found")
    return {"ok": True}


# Manual runs. The API container has no pipeline code (src/ lives in the scheduler image), so the API
# only queues a request; the scheduler container's 1-minute tick (runner.py --run-requests) executes it
# against the stored filings. Delivery stays gated by LEADS_ENABLE_DELIVERY in the scheduler: with it
# off (the default) a manual run stores leads but sends no email.
RUN_MIN_INTERVAL_S = int(os.environ.get("LEADS_RUN_MIN_INTERVAL_S", "600"))


def _run_view(run: dict) -> dict:
    out = {k: run.get(k) for k in db.RUN_REQUEST_FIELDS}
    out["run_id"] = out.pop("id")
    out["status_url"] = f"/runs/{out['run_id']}"
    return out


@app.post("/profiles/{profile_id}/run", status_code=202)
async def run_pipeline(
    profile_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Queue a manual pipeline run for a profile (owner only, paid + active; 1 per profile per 10 min)."""
    profile = db.get_profile(profile_id)
    if not profile or profile.user_id != user.id:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not profile.paid:
        raise HTTPException(status_code=402, detail="An active subscription or early-access code is required.")
    if not profile.active:
        raise HTTPException(status_code=400, detail="Profile not active")

    run, retry_after = db.create_run_request(profile_id, user.id, RUN_MIN_INTERVAL_S)
    if run is None:
        raise HTTPException(
            status_code=429,
            detail=f"A run for this profile was requested recently; try again in {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    return _run_view(run)


@app.get("/runs/{run_id}")
async def get_run_status(
    run_id: str,
    user: db.User = Depends(get_or_create_user)
):
    """Status of a manual run: queued | running | done | error (owner only)."""
    run = db.get_run_request(run_id)
    if not run or run["user_id"] != user.id:
        raise HTTPException(status_code=404, detail="Run not found")
    return _run_view(run)


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

    # Work on the verified payload as plain JSON: newer stripe-python returns StripeObjects whose
    # .get() raises (it is "a dict method, but a Session is not a dict").
    event = json.loads(payload)

    # Handle checkout completion
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        meta = session.get("metadata") or {}
        if meta.get("purpose") == "account":
            # Account-level plan (/v1/checkout): only a session this API created is honoured.
            if session.get("payment_status") in ("paid", "no_payment_required"):
                db.activate_checkout(session["id"], session.get("subscription"))
            return {"received": True}
        profile_id = meta.get("profile_id")

        # complete_payment() is idempotent (keyed by the session id we stored at
        # checkout, so a redelivered event re-applies the same state).
        if profile_id and session.get("payment_status") in ("paid", "no_payment_required"):
            # Mark payment complete and activate profile
            db.complete_payment(
                stripe_session_id=session["id"],
                stripe_payment_intent=session.get("payment_intent")
            )

            # Set up cron for the activated profile
            profile = db.get_profile(profile_id)
            if profile:
                update_cron_entry(profile_id, profile.settings)

    elif event["type"] in ("customer.subscription.created", "customer.subscription.updated",
                           "customer.subscription.deleted"):
        # Account-level grants are keyed by subscription id. (Legacy per-profile subscriptions have no
        # subscription -> profile mapping, so they are not changed here.)
        sub = event["data"]["object"]
        status = sub.get("status")
        if event["type"] == "customer.subscription.deleted":
            mapped = "canceled"
        elif status in ("active", "trialing", "past_due"):
            mapped = "active"
        elif status in ("canceled", "unpaid", "incomplete_expired", "paused"):
            mapped = "canceled"
        else:
            mapped = None
        period_end = sub.get("current_period_end") or next(
            (i.get("current_period_end") for i in (sub.get("items") or {}).get("data", [])
             if i.get("current_period_end")), None)
        renews = (datetime.utcfromtimestamp(int(period_end)).strftime("%Y-%m-%dT%H:%M:%SZ")
                  if period_end and mapped == "active" else None)
        db.update_subscription(sub.get("id"), mapped, renews)

    return {"received": True}


# Initialize database on startup
@app.on_event("startup")
async def startup():
    db.init_db()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5050)
