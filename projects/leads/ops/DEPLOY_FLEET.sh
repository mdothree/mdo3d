#!/usr/bin/env bash
# =============================================================================================
# leads.mdo3d.com / leadsapi.mdo3d.com — fleet deploy (STAGED; NOT RUN BY AGENTS)
#
# REQUIRES THE PRINCIPAL'S GO: this deploys backend auth / DB / payments (MDO production).
#
# Runs from the laptop (control only: no builds here). The build happens on the target host.
# Target: xps (Linux x86_64, docker + compose v2, ~434 GB free). Not littlemini (disk hold),
# not littlemini2 / bigmini (under the 20 GB floor).
#
# Usage:
#   ops/DEPLOY_FLEET.sh preflight     # read-only checks on the host (disk, docker, ports, secrets present)
#   ops/DEPLOY_FLEET.sh deploy        # ship the pushed tip of main, build + start on the host, verify locally
#   ops/DEPLOY_FLEET.sh tunnel        # start the cloudflared tunnel container (after OPERATOR steps below)
#   ops/DEPLOY_FLEET.sh verify        # host-local + public curls (status + bytes)
#   ops/DEPLOY_FLEET.sh rollback      # previous release back into service (data volume untouched)
#   ops/DEPLOY_FLEET.sh status
#
# Env overrides: LEADS_HOST (xps), LEADS_REF (main), LEADS_API_PORT (8150), LEADS_WEB_PORT (3150),
#   LEADS_INGEST_STATES (FL,CO,CT), LEADS_WITH_FRONTEND (1).
#   xps:8050 is already used by another stack, hence 8150/3150.
#
# ---------------------------------------------------------------------------------------------
# OPERATOR STEPS (Principal / identity tokens; do these once, before `deploy` / `tunnel`)
# ---------------------------------------------------------------------------------------------
#  O1. Secrets on the host (never commit, never paste into chat). Create on $LEADS_HOST:
#        ~/leads-app/shared/backend.env   LEADS_API_KEY, FIREBASE_PROJECT_ID=leads-59279,
#                                         STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
#                                         LEADS_STRIPE_PRICE_IDS (allowlist), optional APOLLO_API_KEY
#        ~/leads-app/shared/frontend.env  VITE_* (API URL https://leadsapi.mdo3d.com, Firebase web config,
#                                         VITE_STRIPE_PUBLISHABLE_KEY)
#        ~/leads-app/shared/leads.env     SUNBIZ_SFTP_HOST/USER/PASS (state-published public login),
#                                         optional SOCRATA_APP_TOKEN; MAILGUN_* only if delivery is OK'd
#        ~/leads-app/shared/tunnel.env    TUNNEL_TOKEN=<from step O2>
#      Without backend.env the API still starts: Stripe checkout fails closed, promo codes still work.
#  O2. Cloudflare (MDO3D account, mdo3d.com zone) -> Zero Trust -> Networks -> Tunnels:
#        create a NEW tunnel "mdo3d-leads-xps" (Cloudflared connector) and copy its token into tunnel.env.
#        Do not reuse/migrate tunnel 64d3ed96 (littlemini; its config may serve other hostnames).
#        Delete the two old DNS CNAMEs leads / leadsapi (they point at the dead littlemini tunnel), then
#        add Public Hostnames on the new tunnel:
#          leads.mdo3d.com    -> HTTP  localhost:3150
#          leadsapi.mdo3d.com -> HTTP  localhost:8150
#  O3. Stripe dashboard (live account, Principal): webhook endpoint
#        https://leadsapi.mdo3d.com/stripe-webhook  (event checkout.session.completed); secret -> O1.
#  O4. Firebase console (leads-59279): Authentication -> Settings -> Authorized domains: leads.mdo3d.com.
#  O5. Outbound email stays OFF (LEADS_ENABLE_DELIVERY=0) until the Principal OKs delivery.
# =============================================================================================
set -euo pipefail

HOST="${LEADS_HOST:-xps}"
REF="${LEADS_REF:-main}"
REPO_URL="https://github.com/mdothree/mdo3d.git"
API_PORT="${LEADS_API_PORT:-8150}"
WEB_PORT="${LEADS_WEB_PORT:-3150}"
STATES="${LEADS_INGEST_STATES:-FL,CO,CT}"
WITH_FRONTEND="${LEADS_WITH_FRONTEND:-1}"
BASE='$HOME/leads-app'        # expanded on the host
PROJECT=leads                 # compose project: volumes leads_leads-data / leads_leads-backups persist

say() { printf '\n== %s\n' "$*"; }
remote() { ssh -o ConnectTimeout=15 "$HOST" "$@"; }

compose_env() {
  echo "LEADS_API_PORT=$API_PORT LEADS_WEB_PORT=$WEB_PORT LEADS_INGEST_STATES=$STATES LEADS_ENABLE_DELIVERY=0"
}
services() {
  if [ "$WITH_FRONTEND" = "1" ]; then echo "frontend backend scheduler"; else echo "backend scheduler"; fi
}

preflight() {
  say "preflight on $HOST (read-only)"
  remote "set -e; uname -m; df -h \$HOME | tail -1; docker --version; docker compose version
    for p in $API_PORT $WEB_PORT; do ss -ltn | grep -q \":\$p \" && echo \"PORT \$p IN USE\" || echo \"port \$p free\"; done
    for f in backend.env frontend.env leads.env tunnel.env; do
      [ -s $BASE/shared/\$f ] && echo \"shared/\$f present\" || echo \"shared/\$f MISSING (operator step O1)\"; done
    ls -1 $BASE/releases 2>/dev/null | tail -3 || true; readlink $BASE/current 2>/dev/null || echo 'no current release'"
}

deploy() {
  local tmp sha
  tmp="$(mktemp -d)"
  trap "rm -rf '$tmp'" EXIT
  say "fetch pushed tip of $REF (temporary bare clone; the laptop checkout is not touched)"
  git -c credential.helper= -c credential.helper='!gh auth git-credential' \
      clone --quiet --bare --depth 1 --branch "$REF" "$REPO_URL" "$tmp/repo.git"
  sha="$(git --git-dir="$tmp/repo.git" rev-parse --short=12 HEAD)"
  echo "release $sha"

  say "pre-deploy DB backup (if a scheduler is already running)"
  remote "docker exec leads-scheduler /app/ops/scheduler/backup_db.sh 2>/dev/null || echo 'no running scheduler; skip'"

  say "ship projects/leads@$sha -> $HOST:$BASE/releases/$sha"
  remote "mkdir -p $BASE/releases/$sha $BASE/shared"
  git --git-dir="$tmp/repo.git" archive --format=tar HEAD projects/leads \
    | remote "tar -x -C $BASE/releases/$sha --strip-components=2"

  say "link secrets from shared/ (contents never printed)"
  remote "set -e; R=$BASE/releases/$sha
    [ -f $BASE/shared/backend.env ]  && ln -sf $BASE/shared/backend.env  \$R/web/backend/.env  || true
    # frontend: a real copy, Vite reads .env at image build time and docker build skips outside symlinks
    [ -f $BASE/shared/frontend.env ] && install -m 600 $BASE/shared/frontend.env \$R/web/frontend/.env || true
    [ -f $BASE/shared/leads.env ]    && ln -sf $BASE/shared/leads.env    \$R/.env              || true
    [ -f $BASE/shared/tunnel.env ]   && ln -sf $BASE/shared/tunnel.env   \$R/tunnel.env        || true
    [ -L $BASE/current ] && ln -sfn \$(readlink $BASE/current) $BASE/previous || true
    ln -sfn \$R $BASE/current"

  say "build + start on $HOST ($(services))"
  remote "cd $BASE/current/web && $(compose_env) docker compose -p $PROJECT up -d --build $(services)"

  verify_local || { echo "!! local verify failed -> rolling back"; rollback; exit 1; }
  echo
  echo "Deployed $sha. Public URLs come up after: ops/DEPLOY_FLEET.sh tunnel (needs operator O1/O2)."
}

tunnel() {
  say "start cloudflared tunnel container on $HOST"
  remote "test -s $BASE/shared/tunnel.env || { echo 'shared/tunnel.env missing: do operator step O2'; exit 1; }
    cd $BASE/current/web && $(compose_env) docker compose -p $PROJECT --profile tunnel up -d tunnel"
  sleep 10
  verify_public
}

verify_local() {
  say "host-local checks"
  remote "set -e
    for i in \$(seq 1 30); do curl -fsS -o /dev/null http://127.0.0.1:$API_PORT/health && break; sleep 3; done
    printf 'api /health   '; curl -s -o /dev/null -w '%{http_code} %{size_download}B\n' http://127.0.0.1:$API_PORT/health
    printf 'api /coverage '; curl -s http://127.0.0.1:$API_PORT/coverage; echo
    printf 'api /filings (no auth, expect 401) '; curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:$API_PORT/filings
    test \$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$API_PORT/filings) = 401
    if [ '$WITH_FRONTEND' = 1 ]; then printf 'web /          '; curl -s -o /dev/null -w '%{http_code} %{size_download}B\n' http://127.0.0.1:$WEB_PORT/; fi
    docker ps --filter name=leads- --format '{{.Names}}  {{.Status}}'"
}

verify_public() {
  say "public checks (status + bytes)"
  for u in https://leadsapi.mdo3d.com/health https://leadsapi.mdo3d.com/coverage https://leads.mdo3d.com/; do
    printf '%-40s ' "$u"; curl -s -o /dev/null -w '%{http_code} %{size_download}B\n' --max-time 20 "$u" || true
  done
  printf '%-40s ' "filings without auth (expect 401)"
  curl -s -o /dev/null -w '%{http_code}\n' --max-time 20 https://leadsapi.mdo3d.com/filings || true
}

verify() { verify_local; verify_public; }

rollback() {
  say "rollback on $HOST"
  remote "set -e
    if [ ! -L $BASE/previous ]; then
      echo 'no previous release: stopping the stack (volumes kept)'
      docker rm -f leads-tunnel 2>/dev/null || true
      cd $BASE/current/web && docker compose -p $PROJECT down
      exit 0
    fi
    P=\$(readlink $BASE/previous); C=\$(readlink $BASE/current)
    ln -sfn \$P $BASE/current; ln -sfn \$C $BASE/previous
    cd $BASE/current/web && $(compose_env) docker compose -p $PROJECT up -d --build $(services)
    echo \"current -> \$P\""
  # Schema changes are additive (CREATE TABLE IF NOT EXISTS), so the older release reads the same DB.
  # Restore data only if needed:  docker run --rm -v leads_leads-backups:/b -v leads_leads-data:/d alpine \
  #   sh -c 'gunzip -c /b/leads-<ts>.db.gz > /d/leads.db'   (stop backend + scheduler first)
}

status() {
  remote "readlink $BASE/current || true; docker ps --filter name=leads- --format '{{.Names}}  {{.Status}}  {{.Ports}}';
    docker exec leads-scheduler sh -c 'cat /backups/LAST_BACKUP_OK 2>/dev/null; cat /data/raw/ingest_status.json 2>/dev/null' || true"
}

case "${1:-}" in
  preflight) preflight ;;
  deploy) preflight; deploy ;;
  tunnel) tunnel ;;
  verify) verify ;;
  rollback) rollback ;;
  status) status ;;
  *) sed -n '2,50p' "$0"; exit 2 ;;
esac
