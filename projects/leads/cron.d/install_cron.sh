#!/bin/bash
# Auto-generated crontab for FL Sunbiz Lead Generator
# Generated from profiles.json

# Clear existing leads cron entries
crontab -l 2>/dev/null | grep -v "# mdo3d-leads" > /tmp/current_cron || true

# Add new entries
echo '0 8 * * 1 cd "$HOME/mdo3d/projects/leads/src" && "$HOME/mdo3d/projects/leads/.venv/bin/python" "$HOME/mdo3d/projects/leads/src/runner.py" --profile signals_institute >> "$HOME/mdo3d/projects/leads/logs/signals_institute.log" 2>&1 # mdo3d-leads:signals_institute' >> /tmp/current_cron
echo '0 8 * * 1-5 cd "$HOME/mdo3d/projects/leads/src" && "$HOME/mdo3d/projects/leads/.venv/bin/python" "$HOME/mdo3d/projects/leads/src/runner.py" --profile ridgefield >> "$HOME/mdo3d/projects/leads/logs/ridgefield.log" 2>&1 # mdo3d-leads:ridgefield' >> /tmp/current_cron
echo '0 8 * * 3 cd "$HOME/mdo3d/projects/leads/src" && "$HOME/mdo3d/projects/leads/.venv/bin/python" "$HOME/mdo3d/projects/leads/src/runner.py" --profile huntington_applied >> "$HOME/mdo3d/projects/leads/logs/huntington_applied.log" 2>&1 # mdo3d-leads:huntington_applied' >> /tmp/current_cron
echo '0 8 * * 1 cd "$HOME/mdo3d/projects/leads/src" && "$HOME/mdo3d/projects/leads/.venv/bin/python" "$HOME/mdo3d/projects/leads/src/runner.py" --profile nonprofits_general >> "$HOME/mdo3d/projects/leads/logs/nonprofits_general.log" 2>&1 # mdo3d-leads:nonprofits_general' >> /tmp/current_cron

# Install crontab
crontab /tmp/current_cron
rm /tmp/current_cron

echo "Crontab installed. Current crontab:"
crontab -l | grep "# mdo3d-leads" || echo "No mdo3d-leads entries found"
