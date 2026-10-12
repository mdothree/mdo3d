#!/bin/bash
# FL Sunbiz Lead Generator - host setup (in place, on the ingest host; never the laptop)
# Usage: from a checkout of the mdo3d repo on the ingest host:
#   LEADS_HOME=~/mdo3d/projects/leads bash ~/mdo3d/projects/leads/deploy.sh
# The ingest host is not yet chosen (plan: ~/latarence/docs/plans/input_prompts_0/ Part C §C5).

set -e

DEPLOY_DIR="${LEADS_HOME:-$HOME/mdo3d/projects/leads}"
VENV_DIR="$DEPLOY_DIR/.venv"

echo "=== FL Sunbiz Lead Generator setup in $DEPLOY_DIR ==="
[ -f "$DEPLOY_DIR/src/runner.py" ] || { echo "runner.py not found under $DEPLOY_DIR (set LEADS_HOME)"; exit 1; }

echo "Setting up Python environment..."
python3 -m venv "$VENV_DIR"
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install python-dotenv requests paramiko beautifulsoup4

chmod +x "$DEPLOY_DIR"/src/*.py
mkdir -p "$DEPLOY_DIR/logs"

echo "=== Setup complete ==="
echo "To schedule the profiles (writes + installs only '# mdo3d-leads' lines):"
echo "  cd $DEPLOY_DIR && LEADS_HOME=$DEPLOY_DIR python3 cron.d/generate_cron.py && cron.d/install_cron.sh"
