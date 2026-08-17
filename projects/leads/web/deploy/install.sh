#!/bin/bash
# Install FL Sunbiz Leads API on littlemini
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

echo "Installing FL Sunbiz Leads API..."
echo "Project: $PROJECT_DIR"

# Install Python dependencies
cd "$PROJECT_DIR"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
.venv/bin/pip install -e ".[web]"

# Initialize database
.venv/bin/python -c "from web.backend.db import init_db; init_db()"
echo "Database initialized at data/leads.db"

# Install systemd service
echo "Installing systemd service..."
sudo cp "$SCRIPT_DIR/leads-api.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable leads-api
sudo systemctl start leads-api

echo "Service status:"
sudo systemctl status leads-api --no-pager

echo ""
echo "Done! API running at http://localhost:5050"
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env and fill in secrets"
echo "  2. Set up Cloudflare Tunnel (see cloudflared-config.yml)"
echo "  3. Create Firebase project and get credentials"
echo "  4. Create Stripe products and webhook"
