# FL Sunbiz Lead Generator

Automated lead generation from Florida Division of Corporations filings.

> **Email policy:** email addresses are never guessed. `guess_email_variants` is `false` in every profile and is
> hard-disabled in `src/runner.py`; only addresses published on the business's own site are kept.

## Setup

```bash
cd ~/mdo3d/projects/leads   # canonical checkout (was ~/ridgefield/tools/leads)
source .venv/bin/activate
pip install python-dotenv requests paramiko
```

Add to `.env`:
```
SENDGRID_API_KEY=SG.your_key_here
SUNBIZ_SFTP_HOST=sftp.floridados.gov
SUNBIZ_SFTP_USER=Public
SUNBIZ_SFTP_PASS=PubAccess1845!
```

## Usage

### CLI Mode (One Shot)
```bash
# Run all scheduled profiles
python src/runner.py

# Run specific profile (ignores schedule)
python src/runner.py --profile ridgefield --force

# Skip email enrichment for faster testing
python src/runner.py --profile ridgefield --force --no-email-lookup

# Run multiple profiles
python src/runner.py --profile ridgefield --profile nonprofits_general --force
```

### Daemon Mode (Continuous)
```bash
# Run continuously, check every hour
python src/runner.py --daemon --interval 3600

# Run continuously, check every 15 minutes
python src/runner.py --daemon --interval 900
```

### Individual Scripts
```bash
# Download only
python src/download.py

# Convert TXT to CSV
python src/convert.py data/20260403_corporate.txt

# Extract nonprofits only
python src/convert.py --nonprofits data/20260403_corporate.txt

# Find emails for leads
python src/find_emails.py output/leads.csv

# Send emails only
python src/deliver.py ridgefield
```

## Pipeline Flow

```
SFTP Download → Parse → Filter → Find Emails → Deliver
     ↓              ↓        ↓          ↓          ↓
  .txt file    .csv     profile    enriched   SendGrid
                           CSV       CSV       email
```

## Profiles (`config/profiles.json`)

Each profile defines:
- `active`: Enable/disable
- `email_lookup`: Enable/disable email enrichment for this profile
- `filing_types`: Filter by entity type (FLAL, DOMP, DOMNP, etc.)
- `keywords`: Match in entity name
- `exclude_keywords`: Exclude matches
- `target_counties`: Filter by county
- `delivery.frequency`: daily, weekly, biweekly, monthly
- `delivery.day_of_week`: monday, tuesday, etc.
- `delivery.recipients`: List of {email, name} objects

### Filing Types
- `FLAL` - Florida LLC
- `DOMP` - Domestic Profit Corp
- `FORP` - Foreign Profit Corp
- `DOMNP` - Domestic Non-Profit
- `FORNP` - Foreign Non-Profit
- `DOMLP` - Domestic Limited Partnership

## Output

```

├── data/           # Raw TXT downloads
├── output/         # Filtered & enriched CSVs
├── config/         # profiles.json
├── logs/           # Pipeline logs
└── src/            # Python scripts
```

## Email Enrichment

The `find_emails.py` module searches for business emails:
1. Searches for entity's official website via DuckDuckGo
2. Fetches page and extracts emails
3. Scores by pattern:
   - **HIGH**: info@, contact@, hello@
   - **MEDIUM**: admin@, support@, sales@
   - **LOW**: firstname.lastname@

Up to 3 emails per lead are stored with columns:
- `email_1`, `email_1_score`, `email_1_source`
- `email_2`, `email_2_score`, `email_2_source`
- `email_3`, `email_3_score`, `email_3_source`

Control via:
- Profile setting: `"email_lookup": true/false`
- CLI flag: `--no-email-lookup` to skip enrichment

## Scheduling

### Cron (on the ingest host — never the laptop)

Crontab is generated from profiles.json — each profile's `frequency` and `day_of_week` settings create individual cron entries.

```bash
# On the ingest host, from the leads checkout (default $HOME/mdo3d/projects/leads; override with LEADS_HOME)
python3 cron.d/generate_cron.py      # writes cron.d/leads.cron + cron.d/install_cron.sh
cron.d/install_cron.sh               # replaces only lines tagged "# mdo3d-leads"
```

The ingest host is not yet chosen (see `~/latarence/docs/plans/input_prompts_0/` Part C §C5: fleet host recommended).

Crontab entries run at 8am on configured days (Mon-Fri).

### Daemon Mode (Alternative)
```bash
# Run continuously, check every hour
python src/runner.py --daemon --interval 3600

# Stop daemon
pkill -f "runner.py --daemon"
```

## Notes

- Files only generated on work days (Mon-Fri, excluding holidays)
- Set `download_date` in profiles.json for backfill
- Mailgun is used for outbound delivery (domain-authenticated)
- Multiple recipients supported per profile
