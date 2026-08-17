#!/bin/bash
# Auto-generated crontab for FL Sunbiz Lead Generator
# Generated from profiles.json

# Clear existing leads cron entries
crontab -l | grep -v "ridgefield/tools/leads" > /tmp/current_cron || true

# Add new entries
echo "0 8 * * 1 cd /opt/ridgefield/tools/leads/src && /opt/ridgefield/.venv/bin/python /opt/ridgefield/tools/leads/src/runner.py --profile signals_institute >> /opt/ridgefield/tools/leads/logs/signals_institute.log 2>&1" >> /tmp/current_cron
echo "0 8 * * 1-5 cd /opt/ridgefield/tools/leads/src && /opt/ridgefield/.venv/bin/python /opt/ridgefield/tools/leads/src/runner.py --profile ridgefield >> /opt/ridgefield/tools/leads/logs/ridgefield.log 2>&1" >> /tmp/current_cron
echo "0 8 * * 3 cd /opt/ridgefield/tools/leads/src && /opt/ridgefield/.venv/bin/python /opt/ridgefield/tools/leads/src/runner.py --profile huntington_applied >> /opt/ridgefield/tools/leads/logs/huntington_applied.log 2>&1" >> /tmp/current_cron
echo "0 8 * * 1 cd /opt/ridgefield/tools/leads/src && /opt/ridgefield/.venv/bin/python /opt/ridgefield/tools/leads/src/runner.py --profile nonprofits_general >> /opt/ridgefield/tools/leads/logs/nonprofits_general.log 2>&1" >> /tmp/current_cron

# Install crontab
crontab /tmp/current_cron
rm /tmp/current_cron

echo "Crontab installed. Current crontab:"
crontab -l | grep ridgefield || echo "No ridgefield entries found"
