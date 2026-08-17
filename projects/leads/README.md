# FL Sunbiz Lead Generator

Automated lead generation from Florida Division of Corporations filings.

## Setup

```bash
cd ridgefield
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
python tools/leads/src/runner.py

# Run specific profile (ignores schedule)
python tools/leads/src/runner.py --profile ridgefield --force

# Skip email enrichment for faster testing
python tools/leads/src/runner.py --profile ridgefield --force --no-email-lookup

# Run multiple profiles
python tools/leads/src/runner.py --profile ridgefield --profile nonprofits_general --force
```

### Daemon Mode (Continuous)
```bash
# Run continuously, check every hour
python tools/leads/src/runner.py --daemon --interval 3600

# Run continuously, check every 15 minutes
python tools/leads/src/runner.py --daemon --interval 900
```

### Individual Scripts
```bash
# Download only
python tools/leads/src/download.py

# Convert TXT to CSV
python tools/leads/src/convert.py tools/leads/data/20260403_corporate.txt

# Extract nonprofits only
python tools/leads/src/convert.py --nonprofits tools/leads/data/20260403_corporate.txt

# Find emails for leads
python tools/leads/src/find_emails.py tools/leads/output/leads.csv

# Send emails only
python tools/leads/src/deliver.py ridgefield
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
tools/leads/
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

### Cron (Recommended for littlemini)

Crontab is generated from profiles.json — each profile's `frequency` and `day_of_week` settings create individual cron entries.

```bash
# Generate crontab from profiles.json
python tools/leads/cron.d/generate_cron.py

# Install on littlemini
scp -r tools/leads/cron.d user@littlemini:/opt/ridgefield/tools/leads/
ssh user@littlemini '/opt/ridgefield/tools/leads/cron.d/install_cron.sh'
```

Crontab entries run at 8am on configured days (Mon-Fri).

### Daemon Mode (Alternative)
```bash
# Run continuously, check every hour
python tools/leads/src/runner.py --daemon --interval 3600

# Stop daemon
pkill -f "runner.py --daemon"
```

## Notes

- Files only generated on work days (Mon-Fri, excluding holidays)
- Set `download_date` in profiles.json for backfill
- Mailgun is used for outbound delivery (domain-authenticated)
- Multiple recipients supported per profile
