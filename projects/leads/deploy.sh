#!/bin/bash
# FL Sunbiz Lead Generator - Deployment Script
# Run from littlemini after uploading

set -e

DEPLOY_DIR="/opt/ridgefield/leads"
VENV_DIR="/opt/ridgefield/leads/.venv"

echo "=== FL Sunbiz Lead Generator Deployment ==="

# Create directory
echo "Creating directory structure..."
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $(dirname $DEPLOY_DIR)

# Sync files (run from ridgefield repo root)
echo "Copying files..."
rsync -avz --exclude='.venv' --exclude='.git' --exclude='*.log' \
    tools/leads/ $DEPLOY_DIR/

# Create virtual environment
echo "Setting up Python environment..."
python3 -m venv $VENV_DIR
source $VENV_DIR/bin/activate

pip install --upgrade pip
pip install python-dotenv requests paramiko beautifulsoup4

# Set permissions
chmod +x $DEPLOY_DIR/src/*.py

# Create log directory
mkdir -p $DEPLOY_DIR/logs

echo "=== Deployment Complete ==="
echo "To configure cron, run:"
echo "  crontab -e"
echo ""
echo "Add this line for daily at 8am:"
echo "  0 8 * * 1-5 cd $DEPLOY_DIR/src && .venv/bin/python runner.py >> ../logs/cron.log 2>&1"
