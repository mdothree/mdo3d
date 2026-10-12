#!/usr/bin/env python3
"""
Generate crontab from profiles.json.

Run ON THE HOST that will run ingest (never the laptop):
    python3 cron.d/generate_cron.py && cron.d/install_cron.sh

Paths are host-agnostic: entries use $LEADS_HOME, defaulting to the canonical checkout
$HOME/mdo3d/projects/leads (cron runs commands via /bin/sh, so $HOME expands there).
Override by exporting LEADS_HOME before generating, e.g. LEADS_HOME=/srv/mdo3d/projects/leads.
The venv is expected at $LEADS_HOME/.venv. Every entry carries the marker "# mdo3d-leads"
so reinstall/remove only touch these lines.
"""

import json
import os
from pathlib import Path

CONFIG_DIR = Path(__file__).parent.parent / "config"
CRON_TEMPLATE = """#!/bin/bash
# Auto-generated crontab for FL Sunbiz Lead Generator
# Generated from profiles.json

# Clear existing leads cron entries
crontab -l 2>/dev/null | grep -v "# mdo3d-leads" > /tmp/current_cron || true

# Add new entries
{entries}

# Install crontab
crontab /tmp/current_cron
rm /tmp/current_cron

echo "Crontab installed. Current crontab:"
crontab -l | grep "# mdo3d-leads" || echo "No mdo3d-leads entries found"
"""

FREQUENCY_CRON = {
    "daily": "0 8 * * 1-5",      # 8am Mon-Fri
    "weekly": "0 8 * * {day_num}",  # 8am on specific day
    "biweekly": "0 8 * * {day_num}", # 8am on specific day (even weeks)
    "monthly": "0 8 1 * *",          # 8am 1st of month
}

DAY_MAP = {
    "monday": 1, "tuesday": 2, "wednesday": 3,
    "thursday": 4, "friday": 5, "saturday": 6, "sunday": 0
}

LEADS_HOME = os.environ.get("LEADS_HOME", "$HOME/mdo3d/projects/leads")
SCRIPT_PATH = f"{LEADS_HOME}/src/runner.py"
VENV_PYTHON = f"{LEADS_HOME}/.venv/bin/python"
MARKER = "# mdo3d-leads"


def generate_cron():
    with open(CONFIG_DIR / "profiles.json") as f:
        config = json.load(f)
    
    entries = []
    
    for name, profile in config.get("profiles", {}).items():
        if not profile.get("active", False):
            continue
        
        delivery = profile.get("delivery", {})
        if not delivery.get("recipients") and not delivery.get("recipient_email"):
            continue
        
        frequency = delivery.get("frequency", "daily")
        day = delivery.get("day_of_week", "monday").lower()
        
        if frequency == "daily":
            cron_time = FREQUENCY_CRON["daily"]
        elif frequency == "weekly":
            day_num = DAY_MAP.get(day, 1)
            cron_time = FREQUENCY_CRON["weekly"].format(day_num=day_num)
        elif frequency == "biweekly":
            day_num = DAY_MAP.get(day, 1)
            cron_time = f"0 8 * * {day_num}"
        elif frequency == "monthly":
            cron_time = FREQUENCY_CRON["monthly"]
        else:
            continue
        
        entry = f'{cron_time} cd "{LEADS_HOME}/src" && "{VENV_PYTHON}" "{SCRIPT_PATH}" --profile {name} >> "{LEADS_HOME}/logs/{name}.log" 2>&1 {MARKER}:{name}'
        entries.append(entry)
    
    cron_dir = Path(__file__).parent
    cron_dir.mkdir(exist_ok=True)
    
    cron_file = cron_dir / "leads.cron"
    
    with open(cron_file, "w") as f:
        f.write("# FL Sunbiz Lead Generator Crontab\n")
        for entry in entries:
            f.write(entry + "\n")
    
    # single-quote each entry so $HOME/$LEADS_HOME reach crontab unexpanded (cron's shell expands them)
    install_script = CRON_TEMPLATE.format(entries="\n".join("echo '" + e.replace("'", "'\\''") + "' >> /tmp/current_cron" for e in entries))
    
    install_file = cron_dir / "install_cron.sh"
    with open(install_file, "w") as f:
        f.write(install_script)
    install_file.chmod(0o755)
    
    print(f"Generated crontab at: {cron_file}")
    print(f"Generated install script at: {install_file}")
    print("\nTo install (on the ingest host, from the leads checkout):")
    print("  cron.d/install_cron.sh")


if __name__ == "__main__":
    generate_cron()
