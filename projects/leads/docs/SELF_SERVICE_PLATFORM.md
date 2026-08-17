# FL Sunbiz Leads - Self-Service Platform

## Overview

A self-service web UI where customers can configure their own lead profiles, pay via Stripe, and receive automated lead deliveries.

**Host**: littlemini (via Cloudflare Tunnel)

### Live URLs
| Service | URL |
|---------|-----|
| Frontend | https://leads.mdo3d.com |
| API | https://leadsapi.mdo3d.com |

*Note: API uses `leadsapi` (not `api.leads`) because Cloudflare wildcard SSL only covers single-level subdomains.*

---

## Architecture

```
Internet
    │
Cloudflare Tunnel (cloudflared on littlemini)
    │
    ├── leads.mdo3d.com → localhost:3050
    │   └── React SPA
    │       ├── Landing page
    │       ├── Sign up / Login (Firebase Auth)
    │       ├── Profile builder form
    │       ├── Stripe Checkout
    │       └── Dashboard (edit profile, view history)
    │
    └── leadsapi.mdo3d.com → localhost:8050
        └── FastAPI Backend
            ├── POST /sync - Updates profiles.json + cron
            └── POST /stripe-webhook - Payment confirmation

littlemini (local)
    ├── Existing Pipeline
    │   ├── runner.py (unchanged)
    │   ├── profiles.json (now includes customer profiles)
    │   └── cron (one entry per profile)
    │
    └── cloudflared (tunnel daemon)
```

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Frontend | React + Vite + Tailwind | Modern, fast builds |
| Auth | Firebase Auth | Easy, no password management |
| Backend | FastAPI | Python, matches pipeline |
| Database | SQLite | Simple, users + payment status |
| Payments | Stripe Checkout | Hosted payment, minimal PCI |
| Hosting | littlemini + nginx | Keep everything contained |

---

## Core Design Decisions

### Why Host Backend on littlemini?

Firebase/Firestore would require syncing to littlemini where the pipeline runs. By hosting the backend directly on littlemini:
- Direct file access to `profiles.json`
- Can safely coordinate with cron/runner.py
- No sync issues or webhooks needed
- Single source of truth

### Cron Management

**Approach**: Separate cron entry per profile with markers for safe updates.

```bash
# Example crontab
0 8 * * 1-5 cd /path && python runner.py --profile user_abc123 # LEADS:user_abc123
0 8 * * 1   cd /path && python runner.py --profile user_def456 # LEADS:user_def456
```

The `# LEADS:{id}` marker allows updating individual entries without touching others.

**Safety**: The sync endpoint updates only the specific profile's cron line, not the entire crontab.

### API Authentication

Single admin API key (not per-user) since users don't need direct API access:
- Frontend embeds API key (can be rotated)
- Backend validates `X-API-Key` header
- User auth handled separately via Firebase

---

## Data Flow

### User Signup & Payment
```
User visits leads.mdo3d.com
    → Signs up (Firebase Auth)
    → Configures profile (keywords, counties, frequency)
    → Pays via Stripe Checkout
    → Stripe webhook marks user as paid
    → Frontend calls /api/sync
    → Backend updates profiles.json + cron
    → User receives leads on schedule
```

### Profile Edit
```
User logs in
    → Edits profile in dashboard
    → Frontend calls /api/sync
    → Backend updates profiles.json
    → If schedule changed: updates cron entry
    → Next run uses new settings
```

---

## Backend Implementation

Minimal FastAPI app (~50 lines):

```python
# tools/leads/web/api.py
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
import subprocess, json, os
from pathlib import Path

app = FastAPI()
API_KEY = os.environ.get("LEADS_API_KEY")
PROFILES_PATH = Path(__file__).parent.parent / "config" / "profiles.json"

class ProfileData(BaseModel):
    profile_id: str
    data: dict

@app.post("/sync")
async def sync_profile(profile: ProfileData, x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(401, "Unauthorized")

    # 1. Update profiles.json
    with open(PROFILES_PATH) as f:
        profiles = json.load(f)
    profiles["profiles"][profile.profile_id] = profile.data
    with open(PROFILES_PATH, "w") as f:
        json.dump(profiles, f, indent=2)

    # 2. Update cron for this profile
    update_cron(profile.profile_id, profile.data)

    return {"ok": True}

def update_cron(profile_id: str, data: dict):
    # Read current crontab
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    lines = [l for l in result.stdout.split("\n")
             if f"LEADS:{profile_id}" not in l and l.strip()]

    # Add new entry if active and paid
    if data.get("active") and data.get("paid"):
        schedule = build_schedule(data)
        lines.append(f'{schedule} cd /path && python runner.py --profile {profile_id} # LEADS:{profile_id}')

    # Write back
    subprocess.run(["crontab", "-"], input="\n".join(lines) + "\n", text=True)
```

---

## Profile Schema (Firestore/SQLite → profiles.json)

```json
{
  "profile_id": "user_abc123",
  "name": "My Tech Leads",
  "active": true,
  "paid": true,
  "email_lookup": true,
  "date_range": "daily",
  "max_leads": 30,
  "filing_types": ["FLAL", "DOMP", "FORP"],
  "keywords": ["technology", "software", "cloud"],
  "exclude_keywords": ["church", "insurance"],
  "target_counties": ["DADE", "BROWARD"],
  "delivery": {
    "frequency": "daily",
    "day_of_week": "monday",
    "recipient_email": "user@example.com",
    "recipient_name": "John Doe"
  },
  "sender": "leads@ridgefield.llc"
}
```

---

## Pricing Options (TBD)

| Model | Price | Notes |
|-------|-------|-------|
| Monthly subscription | $29/mo | Recurring, cancel anytime |
| One-time 30-day | $99 | Must re-purchase to continue |
| Per-lead credits | $0.50/lead | Buy 100 for $49 |

---

## Deployment Checklist

### Cloudflare Tunnel (littlemini)
- [x] Install cloudflared on littlemini
- [x] Create tunnel in Butts Technologies account (ID: `64d3ed96-0f2e-4940-8e9e-99fa5bc4aa86`)
- [x] Configure routes in `~/.cloudflared/mdo3d-leads.yml`
- [x] Add CNAME records in Cloudflare DNS:
  - `leads` → tunnel
  - `leadsapi` → tunnel
- [x] Run tunnel as service

### Docker (littlemini)
- [x] Frontend container (leads-frontend, port 3050)
- [x] Backend container (leads-backend, port 8050)
- [x] docker-compose.yml with project name `leads`

### Firebase
- [x] Create Firebase project (leads-59279)
- [x] Enable Email/Password auth
- [x] Enable Google auth
- [x] Frontend config via VITE_FIREBASE_* env vars
- [x] Backend token verification via FIREBASE_PROJECT_ID

### Stripe
- [x] Create Stripe products/prices (Starter $29, Pro $79, Enterprise $249)
- [x] Set up webhook endpoint
- [x] Live API keys configured

### React App
- [x] Login page (email/password, Google)
- [x] Onboarding flow (account, plan, payment, preferences)
- [x] Dashboard page
- [x] Leads listing page
- [x] Settings page
- [x] Pipeline trigger page

### Backend API
- [x] Firebase token verification
- [x] Profile CRUD endpoints
- [x] Stripe Checkout session creation
- [x] Webhook handling
- [x] Code redemption endpoint
- [x] Leads retrieval endpoints
- [x] Cron management for profiles

---

## File Structure (Planned)

```
tools/leads/
├── web/
│   ├── frontend/           # React app
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── ProfileForm.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── Checkout.tsx
│   │   │   ├── firebase.ts
│   │   │   └── api.ts
│   │   ├── dist/           # Built static files
│   │   └── package.json
│   │
│   ├── backend/
│   │   ├── api.py          # FastAPI app
│   │   └── requirements.txt
│   │
│   └── deploy/
│       ├── cloudflared-config.yml
│       └── leads-api.service
│
├── src/
│   └── runner.py           # Existing pipeline
├── config/
│   └── profiles.json       # Now includes customer profiles
└── docs/
    └── SELF_SERVICE_PLATFORM.md  # This file
```

---

## Alternative Considered: Master Cron

Instead of per-profile crons, a single cron that checks what's due:

```bash
0 * * * * python runner.py --scheduled
```

**Pros**: No cron management, simpler
**Cons**: Requires run history tracking, less granular logging

Decision: Stick with per-profile crons for now. The marker-based update is safe enough.

---

## Multi-State Expansion Notes

Currently FL only. Other states with bulk data access:

| State | Access | Cost | Status |
|-------|--------|------|--------|
| Florida | SFTP (public) | Free | Implemented |
| California | API + Bulk | $100 one-time | Potential |
| Texas | SOSDirect | Subscription | Potential |
| Minnesota | CSV delivery | $30/week | Potential |

See: https://dos.fl.gov/sunbiz/other-services/data-downloads/

---

## Decisions Made

1. **Pricing model** - Monthly subscription with 3 tiers:
   - Starter: $29/mo (100 leads, 1 run/day)
   - Pro: $79/mo (2,000 leads, unlimited runs)
   - Enterprise: $249/mo (unlimited)

2. **Email sending** - Using Mailgun (leads@mdo3d.com)

3. **White-labeling** - Not implemented (future consideration)

4. **Usage limits** - Capped by plan tier (max_leads setting)

5. **Free access** - Code redemption system for beta testers/promos

## Remaining Tasks

- [ ] Stripe webhook testing (production)
- [ ] Cron job activation after payment
- [ ] Email delivery integration
- [ ] Lead statistics dashboard
- [ ] Profile editing in settings
