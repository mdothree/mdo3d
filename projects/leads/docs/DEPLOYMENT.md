# Leads Platform Deployment

## Current Status

**Live URLs**:
- Frontend: https://leads.mdo3d.com
- API: https://leadsapi.mdo3d.com

**Host**: littlemini (via Cloudflare Tunnel)

---

## Docker Setup

### Project Structure

```
web/
├── docker-compose.yml    # Project name: leads
├── frontend/
│   ├── Dockerfile        # Multi-stage: Node build → serve
│   ├── .env              # VITE_* environment variables
│   └── src/
└── backend/
    ├── Dockerfile        # Python 3.11 + uvicorn
    ├── .env              # API keys, Firebase config
    ├── api.py
    └── db.py
```

### Container Configuration

| Service | Container | Port | Image |
|---------|-----------|------|-------|
| Frontend | leads-frontend | 3050 | node:20-alpine + serve |
| Backend | leads-backend | 8050 | python:3.11-slim + uvicorn |

### Commands

```bash
# Start/rebuild
cd ~/ridgefield/tools/leads/web
docker compose up -d --build

# View logs
docker logs leads-backend -f
docker logs leads-frontend -f

# Check status
docker compose ps

# Stop
docker compose down
```

### Important: Project Naming

The `docker-compose.yml` includes `name: leads` to avoid conflicts with other projects (e.g., latarence.ai) that might use the same directory name "web".

---

## Cloudflare Tunnel

### Tunnel Details

- **Account**: MDO3D (mdo3d.com DNS zone)
- **Tunnel ID**: `64d3ed96-0f2e-4940-8e9e-99fa5bc4aa86`
- **Config**: `~/.cloudflared/mdo3d-config.yml`

### Configuration

```yaml
tunnel: 64d3ed96-0f2e-4940-8e9e-99fa5bc4aa86
credentials-file: ~/.cloudflared/mdo3d-credentials.json

ingress:
  - hostname: leads.mdo3d.com
    service: http://localhost:3050
  - hostname: leadsapi.mdo3d.com
    service: http://localhost:8050
  - service: http_status:404
```

### SSL Note

The API uses `leadsapi.mdo3d.com` (not `api.leads.mdo3d.com`) because Cloudflare's Universal SSL wildcard (`*.mdo3d.com`) only covers single-level subdomains, not two-level subdomains like `api.leads.mdo3d.com`.

### Running the Tunnel

```bash
# Manual
cloudflared tunnel --config ~/.cloudflared/mdo3d-config.yml run

# As service (recommended)
sudo cloudflared service install
sudo launchctl start com.cloudflare.cloudflared
```

---

## Environment Variables

### Frontend (.env)

```env
# API
VITE_API_URL=https://leadsapi.mdo3d.com

# Firebase
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=leads-59279.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=leads-59279
VITE_FIREBASE_STORAGE_BUCKET=leads-59279.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Stripe price IDs (MDO3D Stripe account):

| Plan | Price ID |
|------|----------|
| Starter ($29/mo) | `price_1TbTQNCRLa19N9qBa7wk8c3j` |
| Pro ($79/mo) | `price_1TbTQNCRLa19N9qBezJO7C2P` |
| Enterprise ($249/mo) | `price_1TbTQOCRLa19N9qBpRYvkhZC` |

### Backend (.env)

```env
LEADS_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FIREBASE_PROJECT_ID=leads-59279
```

### Stripe Dashboard Updates (After Domain Change)

- Webhook endpoint URL: `https://leadsapi.mdo3d.com/stripe-webhook`
- If using Stripe Customer Portal: update allowed return URLs to include `https://leads.mdo3d.com`

---

## Firebase Setup

- **Project**: leads-59279
- **Auth Methods**: Email/Password, Google
- **Admin SDK**: Uses `FIREBASE_PROJECT_ID` env var (no service account file needed for token verification)

### Token Verification

The backend verifies Firebase ID tokens using:
```python
firebase_admin.initialize_app(cred, {
    'projectId': FIREBASE_PROJECT_ID
})
```

---

## Database

SQLite database at `web/backend/leads.db`:

### Tables

- `users` - Firebase auth users
- `profiles` - Lead generation profiles
- `payments` - Stripe payment records
- `leads` - Generated leads per profile
- `codes` - Redemption codes for free access
- `code_redemptions` - Code usage tracking

---

## Features Implemented

### Core

- [x] Firebase Authentication (email/password, Google)
- [x] User profiles with settings
- [x] Stripe Checkout integration
- [x] Lead storage and retrieval
- [x] Pipeline execution (manual trigger)

### Code Redemption

Allows free access without payment:

```python
# Create a code (via SQLite)
INSERT INTO codes (code, max_uses) VALUES ('BETA2026', 100);
```

Users can redeem codes to activate profiles without going through Stripe.

---

## Issues Resolved

### 1. Cloudflare Tunnel Error 1033

**Cause**: Tunnel was in the wrong Cloudflare account for the DNS zone.

**Fix**: Created new tunnel in Butts Technologies account.

### 2. SSL Handshake Failure

**Cause**: `api.leads.mdo3d.com` (two-level subdomain) not covered by wildcard SSL.

**Fix**: Use `leadsapi.mdo3d.com` (single-level subdomain).

### 3. Firebase Project ID Missing

**Cause**: `FIREBASE_PROJECT_ID` env var not passed to `firebase_admin.initialize_app()`.

**Fix**: Added `projectId` to app options.

### 4. Docker Project Name Conflict

**Cause**: Both leads and latarence.ai projects used default name "web".

**Fix**: Added `name: leads` to docker-compose.yml.

---

## Monitoring

### Health Check

```bash
curl https://leadsapi.mdo3d.com/health
```

### Container Logs

```bash
ssh littlemini "docker logs leads-backend --tail 50"
ssh littlemini "docker logs leads-frontend --tail 50"
```

### Error Locations

| Layer | Where to Check |
|-------|----------------|
| Frontend | Browser console (F12) |
| Backend | `docker logs leads-backend` |
| Firebase | Browser console + Firebase Console |
| Tunnel | `journalctl -u cloudflared` |

---

## Deployment Workflow

```bash
# 1. Make changes locally
# 2. Commit
git add -A && git commit -m "Description"

# 3. Push and deploy
git push origin main
ssh littlemini "cd ~/ridgefield/tools/leads && git pull && cd web && docker compose up -d --build"
```
