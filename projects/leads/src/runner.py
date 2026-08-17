#!/usr/bin/env python3
"""
FL Sunbiz Lead Generator - Single Entry Point

Usage:
    python runner.py                              # Run all scheduled profiles
    python runner.py --profile ridgefield         # Run specific profile
    python runner.py --force                      # Force run (ignore schedule)
    python runner.py --cron generate              # Generate crontab from profiles

Date Range Options:
    python runner.py --last-week --force          # Last 7 workdays
    python runner.py --last-month --force         # Last 30 days
    python runner.py --date-from 20260401 --date-to 20260403 --force  # Custom range
    python runner.py --date 20260403 --force      # Single specific date

Profile Settings (in profiles.json):
    "date_range": "daily"   # Default: single day
    "date_range": "weekly"  # Last 7 workdays
    "date_range": "monthly" # Last 30 days

    CLI flags (--last-week, --date-from, etc.) override profile settings.

Other Flags:
    --no-email-lookup                             # Skip email enrichment
"""

import os
import sys
import json
import time
import signal
import argparse
import csv
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict
from dataclasses import dataclass, asdict
from dotenv import load_dotenv

load_dotenv()

TOOLS_DIR = Path(__file__).parent.parent
CONFIG_DIR = TOOLS_DIR / "config"
DATA_DIR = TOOLS_DIR / "data"
OUTPUT_DIR = TOOLS_DIR / "output"
LOG_DIR = TOOLS_DIR / "logs"

MAILGUN_API_KEY = os.environ.get("MAILGUN_API_KEY", "")
MAILGUN_DOMAIN = os.environ.get("MAILGUN_DOMAIN", "")
MAILGUN_BASE_URL = os.environ.get("MAILGUN_BASE_URL", "https://api.mailgun.net")

# Legacy (deprecated): previously used for outbound delivery.
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDGRID_ENDPOINT = "https://api.sendgrid.com/v3/mail/send"

APOLLO_API_KEY = os.environ.get("APOLLO_API_KEY", "")
APOLLO_RATE_LIMIT = int(os.environ.get("APOLLO_RATE_LIMIT", "10"))
APOLLO_RATE_PERIOD = int(os.environ.get("APOLLO_RATE_PERIOD", "60"))

EMAIL_RATE_LIMIT = int(os.environ.get("EMAIL_RATE_LIMIT", "10"))
EMAIL_RATE_PERIOD = int(os.environ.get("EMAIL_RATE_PERIOD", "60"))

_email_sent_timestamps = []
_apollo_request_timestamps = []

CORPORATE_LAYOUT = [
    (0, 12, "doc_number"),
    (12, 192, "corp_name"),
    (204, 1, "status"),
    (205, 15, "filing_type"),
    (220, 42, "address_1"),
    (262, 42, "address_2"),
    (304, 28, "city"),
    (332, 2, "state"),
    (334, 10, "zip_code"),
    (472, 8, "file_date"),
    (480, 14, "fei_number"),
    (544, 42, "registered_agent"),
    (629, 28, "ra_city"),
    (657, 2, "ra_state"),
]

FIC_LAYOUT = [
    (0, 12, "doc_number"),
    (12, 192, "fic_name"),
    (204, 12, "county"),
    (216, 40, "address_1"),
    (296, 28, "city"),
    (324, 2, "state"),
    (326, 10, "zip_code"),
    (338, 8, "filing_date"),
    (351, 1, "status"),
    (360, 8, "expiration_date"),
]

STOP_FLAG = False


def log(msg: str, level: str = "INFO"):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] [{level}] {msg}")
    LOG_DIR.mkdir(exist_ok=True)
    with open(LOG_DIR / "pipeline.log", "a") as f:
        f.write(f"[{ts}] [{level}] {msg}\n")


def check_email_rate_limit() -> bool:
    """Check if we can send an email based on rate limits. Returns True if allowed."""
    global _email_sent_timestamps
    now = time.time()
    _email_sent_timestamps = [ts for ts in _email_sent_timestamps if now - ts < EMAIL_RATE_PERIOD]
    if len(_email_sent_timestamps) >= EMAIL_RATE_LIMIT:
        return False
    _email_sent_timestamps.append(now)
    return True


def wait_for_email_quota():
    """Wait until email rate limit allows sending."""
    while not check_email_rate_limit():
        log("Email rate limit reached, waiting...", "WARN")
        time.sleep(5)


def check_apollo_rate_limit() -> bool:
    """Check if we can make an Apollo API call based on rate limits."""
    global _apollo_request_timestamps
    now = time.time()
    _apollo_request_timestamps = [ts for ts in _apollo_request_timestamps if now - ts < APOLLO_RATE_PERIOD]
    if len(_apollo_request_timestamps) >= APOLLO_RATE_LIMIT:
        return False
    _apollo_request_timestamps.append(now)
    return True


def wait_for_apollo_quota():
    """Wait until Apollo API rate limit allows request."""
    while not check_apollo_rate_limit():
        log("Apollo rate limit reached, waiting...", "WARN")
        time.sleep(1)


def load_profiles() -> dict:
    """Load active, paid profiles from database.

    Falls back to profiles.json if database import fails (for standalone usage).
    """
    try:
        import sys
        sys.path.insert(0, str(TOOLS_DIR / "web" / "backend"))
        from db import get_all_active_profiles, init_db
        init_db()  # Ensure DB exists
        profiles = get_all_active_profiles()
        if profiles:
            log(f"Loaded {len(profiles)} profiles from database")
            return profiles
        # Fall through to JSON if no profiles in DB
    except Exception as e:
        log(f"Could not load from database ({e}), falling back to profiles.json", "WARN")

    # Fallback: load from profiles.json for backward compatibility
    with open(CONFIG_DIR / "profiles.json") as f:
        return json.load(f).get("profiles", {})


def get_workday_date(days_back: int = 0) -> str:
    today = datetime.now()
    if today.weekday() < 5 and days_back == 0:
        return today.strftime("%Y%m%d")
    if today.weekday() == 5:
        days_back = max(days_back, 1)
    elif today.weekday() == 6:
        days_back = max(days_back, 2)
    work_day = today - timedelta(days=days_back)
    while work_day.weekday() >= 5:
        work_day -= timedelta(days=1)
    return work_day.strftime("%Y%m%d")


def get_date_range(days: int = 7) -> List[str]:
    """Get list of dates for the past N days (workdays only)."""
    dates = []
    today = datetime.now()
    for i in range(1, days + 1):
        d = today - timedelta(days=i)
        if d.weekday() < 5:  # Mon-Fri
            dates.append(d.strftime("%Y%m%d"))
    return dates


def get_date_range_between(start_date: str, end_date: str) -> List[str]:
    """Get list of workday dates between start and end (inclusive)."""
    dates = []
    current = datetime.strptime(start_date, "%Y%m%d")
    end = datetime.strptime(end_date, "%Y%m%d")

    while current <= end:
        if current.weekday() < 5:  # Mon-Fri only
            dates.append(current.strftime("%Y%m%d"))
        current += timedelta(days=1)

    return dates


def resolve_date_range(args, profile: dict) -> List[str]:
    """Resolve date range from CLI args or profile settings.

    Priority: CLI flags > profile date_range setting > default (single day)
    """
    today = datetime.now()

    # CLI flags take precedence
    if args.last_week:
        return get_date_range(7)

    if args.last_month:
        return get_date_range(30)

    if args.date_from:
        end_date = args.date_to or today.strftime("%Y%m%d")
        return get_date_range_between(args.date_from, end_date)

    # Profile-based date range (cadence-based default)
    date_range_setting = profile.get("date_range", "daily")

    if date_range_setting == "weekly":
        return get_date_range(7)
    elif date_range_setting == "monthly":
        return get_date_range(30)

    # Default: single day (today or specified date)
    if args.date:
        return [args.date]
    return [get_workday_date()]


def should_send_today(profile: dict) -> bool:
    delivery = profile.get("delivery", {})
    if not delivery.get("recipients") and not delivery.get("recipient_email"):
        return False
    frequency = delivery.get("frequency", "daily")
    day = delivery.get("day_of_week", "monday").lower()
    today_day = datetime.now().strftime("%A").lower()
    if frequency == "daily":
        return True
    elif frequency == "weekly":
        return today_day == day
    elif frequency == "biweekly":
        return today_day == day and datetime.now().isocalendar()[1] % 2 == 0
    elif frequency == "monthly":
        return datetime.now().day == 1 and today_day == day
    return False


def connect_sftp():
    import paramiko
    host = os.environ.get("SUNBIZ_SFTP_HOST", "sftp.floridados.gov")
    user = os.environ.get("SUNBIZ_SFTP_USER", "Public")
    password = os.environ.get("SUNBIZ_SFTP_PASS", "")
    transport = paramiko.Transport((host, 22))
    transport.connect(username=user, password=password)
    return paramiko.SFTPClient.from_transport(transport)


def download_and_parse(dates: List[str]) -> tuple:
    """Download files for multiple dates and return combined filings.

    Each filing is tagged with _source_date for deduplication (keeps most recent).
    """
    all_corporate = []
    all_fic = []

    try:
        sftp = connect_sftp()
        try:
            for ds in dates:
                try:
                    corp_local = DATA_DIR / f"{ds}_corporate.txt"
                    sftp.get(f"doc/cor/{ds}c.txt", str(corp_local))
                    filings = parse_corporate(corp_local)
                    # Tag with source date for deduplication
                    for f in filings:
                        f['_source_date'] = ds
                    all_corporate.extend(filings)
                    log(f"Downloaded {len(filings)} corporate filings from {ds}")
                except FileNotFoundError:
                    log(f"No corporate file for {ds}", "WARN")

                try:
                    fic_local = DATA_DIR / f"{ds}_fictitious.txt"
                    sftp.get(f"doc/fic/{ds}f.txt", str(fic_local))
                    fic_filings = parse_fic(fic_local)
                    # Tag with source date for deduplication
                    for f in fic_filings:
                        f['_source_date'] = ds
                    all_fic.extend(fic_filings)
                    log(f"Downloaded {len(fic_filings)} FIC filings from {ds}")
                except FileNotFoundError:
                    log(f"No FIC file for {ds}", "WARN")
        finally:
            sftp.close()
    except Exception as e:
        log(f"Download error: {e}", "ERROR")
        raise

    # Deduplicate by doc_number, keeping most recent (highest date)
    all_corporate = dedupe_filings(all_corporate)
    all_fic = dedupe_filings(all_fic)

    return all_corporate, all_fic


def dedupe_filings(filings: List[dict]) -> List[dict]:
    """Deduplicate filings by doc_number, keeping the most recent entry."""
    if not filings:
        return filings

    # Sort by date descending (most recent first)
    filings.sort(key=lambda x: x.get('_source_date', ''), reverse=True)

    seen = {}
    for f in filings:
        doc = f.get('doc_number')
        if doc and doc not in seen:
            # Remove temp field before storing
            clean = {k: v for k, v in f.items() if k != '_source_date'}
            seen[doc] = clean

    return list(seen.values())


def parse_fixed_width(line: str, layout: list) -> dict:
    return {name: line[start:start+length].strip() for start, length, name in layout}


def parse_corporate(filepath: Path) -> List[dict]:
    filings = []
    with open(filepath, 'r', encoding='ascii', errors='replace') as f:
        for line in f:
            if len(line) < 1440:
                continue
            filings.append(parse_fixed_width(line, CORPORATE_LAYOUT))
    return filings


def parse_fic(filepath: Path) -> List[dict]:
    filings = []
    with open(filepath, 'r', encoding='ascii', errors='replace') as f:
        for line in f:
            if len(line) < 2098:
                continue
            filings.append(parse_fixed_width(line, FIC_LAYOUT))
    return filings


def filter_leads(filings: List[dict], profile: dict) -> List[dict]:
    filing_types = profile.get("filing_types", [])
    keywords = profile.get("keywords", [])
    exclude = profile.get("exclude_keywords", [])
    target_counties = profile.get("target_counties", [])
    is_nonprofit = profile.get("name", "").lower().find("nonprofit") >= 0 or \
                    profile.get("name", "").lower().find("grassroots") >= 0
    
    leads = []
    for row in filings:
        if row.get('status') != 'A':
            continue
        
        doc_number = row.get('doc_number', '')
        
        # Nonprofits: filter by doc_number starting with N
        if is_nonprofit:
            if not doc_number.startswith('N'):
                continue
        elif filing_types:
            if row.get('filing_type', '').strip() not in filing_types:
                continue
        name = row.get('corp_name', row.get('fic_name', '')).lower()
        if exclude and any(k.lower() in name for k in exclude):
            continue
        if keywords and not any(k.lower() in name for k in keywords):
            continue
        if target_counties:
            county = row.get('county', '').upper()
            state = row.get('state', '').upper()
            if state == 'FL' and county not in target_counties:
                continue
        leads.append(row)
    return leads


def save_csv(filings: List[dict], output_path: Path):
    if not filings:
        open(output_path, 'w').close()
        return
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=filings[0].keys())
        writer.writeheader()
        writer.writerows(filings)


def save_leads_to_db(profile_id: str, csv_path: Path, source_date: str):
    """Persist leads to database for API access."""
    import sys
    sys.path.insert(0, str(TOOLS_DIR / "web" / "backend"))

    try:
        from db import create_lead, init_db

        # Ensure database is initialized
        init_db()

        if not csv_path.exists():
            log(f"  No CSV file to persist: {csv_path}", "WARN")
            return 0

        count = 0
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Add source_date to lead data
                row['source_date'] = source_date
                create_lead(profile_id, row)
                count += 1

        log(f"  Persisted {count} leads to database")
        return count

    except Exception as e:
        log(f"  Failed to persist leads to DB: {e}", "ERROR")
        return 0


def find_emails_for_leads(csv_path: Path, output_path: Path, max_leads: int = 20, 
                           profile: dict = None) -> int:
    """Find emails using DuckDuckGo search + web scraping + Apollo.
    
    Configurable via profile settings (email_methods):
    - use_apollo: bool - Use Apollo API for enrichment (default: false)
    - use_godaddy: bool - Skip GoDaddy/registrar domains in results (default: true)
                       When true, adds godaddy, domain.com, name.com, etc. to skip list
    - skip_domains: list - Additional domains to skip (appended to default list)
    - verify_mx: bool - Verify emails have valid MX records (default: false)
    - verify_smtp: bool - Verify mailboxes exist via SMTP (default: false)
    - guess_email_variants: bool - Generate email variants when validation fails (default: true)
                               When an email passes MX/SMTP validation fails, generates variants
                               of the local part (e.g., john.smith -> john_smith, jsmith) and
                               re-validates them. Good for company emails.
    - max_variant_attempts: int - Max variant mutations per email (default: 10)
    """
    profile = profile or {}
    email_config = profile.get("email_methods", {})
    use_apollo = email_config.get("use_apollo", False)
    use_godaddy = email_config.get("use_godaddy", True)
    extra_skip_domains = email_config.get("skip_domains", [])
    verify_mx = email_config.get("verify_mx", False)
    verify_smtp = email_config.get("verify_smtp", False)
    guess_variants = email_config.get("guess_email_variants", True)
    max_variant_attempts = email_config.get("max_variant_attempts", 10)
    
    import requests
    import re
    from urllib.parse import urlparse
    from bs4 import BeautifulSoup

    HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    SKIP_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
                    "icloud.com", "me.com", "live.com", "msn.com"]
    
    if use_godaddy:
        SKIP_DOMAINS.extend(["godaddy", "domain.com", "name.com", "register.com", 
                             "enom.com", "hover.com", "dynadot", "namecheap"])
    if extra_skip_domains:
        SKIP_DOMAINS.extend(extra_skip_domains)
    SKIP_PATTERNS = ["noreply", "no-reply", "example", "test", "sentry", "wix", "godaddy",
                     "wordpress", "squarespace", "mailchimp", "constantcontact"]

    def search_apollo(company_name: str, location: str = None, domain: str = None) -> list:
        """Search Apollo API for company and get contact emails.
        
        Args:
            company_name: Name of the company to search
            location: City, state location for better matching
            domain: Company domain (e.g., 'example.com') for more accurate matching
        """
        if not APOLLO_API_KEY:
            return []
        
        wait_for_apollo_quota()
        
        import requests
        from urllib.parse import urlparse
        
        url = "https://api.apollo.io/api/v1/people/match"
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "x-api-key": APOLLO_API_KEY
        }
        
        payload = {}
        
        if domain:
            parsed = urlparse(domain if domain.startswith('http') else f'https://{domain}')
            payload["domain"] = parsed.netloc or domain
        else:
            payload["q_organization_name"] = company_name
            if location:
                payload["q_locations"] = [location]
        
        log(f"    Apollo query: domain={payload.get('domain')}, name={company_name[:30]}")
        
        try:
            resp = requests.post(url, json=payload, headers=headers, timeout=15)
            if resp.status_code == 200:
                data = resp.json()
                person = data.get("person", {})
                email = person.get("email")
                if email and "@" in email:
                    domain = email.split("@")[-1].lower()
                    if domain not in SKIP_DOMAINS:
                        email_status = person.get("email_status", "")
                        score = "HIGH" if email_status == "verified" else "MEDIUM"
                        log(f"    Apollo found: {email} ({score})")
                        return [(email, score)]
                else:
                    log(f"    Apollo: no email found for {company_name}", "WARN")
            else:
                log(f"    Apollo HTTP {resp.status_code}: {resp.text[:100]}", "WARN")
        except Exception as e:
            log(f"    Apollo error: {e}", "WARN")
        return []

    def extract_emails(text):
        emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)
        valid = []
        for e in emails:
            domain = e.split('@')[-1].lower()
            if domain in SKIP_DOMAINS:
                continue
            if any(p in e.lower() for p in SKIP_PATTERNS):
                continue
            if len(e) > 50:
                continue
            valid.append(e)
        return list(set(valid))

    def score_email(email):
        e = email.lower()
        if any(p in e for p in ["info@", "contact@", "hello@", "office@", "business@", "inquir"]):
            return "HIGH"
        if any(p in e for p in ["admin@", "support@", "sales@", "service@", "help@", "team@"]):
            return "MEDIUM"
        return "LOW"

    def generate_local_part_variants(local_part: str) -> list[str]:
        """Generate variations of an email local part.
        
        Examples:
            'john.smith' -> ['john_smith', 'johnsmith', 'jsmith', 'j.smith', 'smith', 
                             'john_s', 'j_smith', 'smithj', 'smith_j', 'john']
        """
        if not local_part:
            return []
        
        local = local_part.lower().strip()
        variants = set()
        
        parts = re.split(r'[._-]+', local)
        if len(parts) >= 2:
            first = parts[0]
            last = parts[-1]
            
            if first and last:
                variants.add(f"{first}_{last}")
                variants.add(f"{first}{last}")
                variants.add(f"{first[0]}{last}")
                variants.add(f"{first[0]}.{last}")
                variants.add(last)
                
                variants.add(f"{last}_{first}")
                variants.add(f"{last}{first[0]}")
                variants.add(f"{last}.{first[0]}")
                
                if len(first) > 1:
                    variants.add(f"{first[0]}_{last}")
                    variants.add(f"{first}_{last[0]}")
        
        variants.add(local.replace('.', '_'))
        variants.add(local.replace('_', '.'))
        variants.add(local.replace('.', ''))
        variants.add(local.replace('_', ''))
        
        if len(local) <= 2:
            return [v for v in variants if v and v != local]
        
        if len(local) > 3:
            cleaned = local.replace('.', '').replace('_', '')
            variants.add(cleaned)
        
        return [v for v in variants if v and v != local]

    from validate_email import verify_mx_record, verify_smtp as smtp_verify

    def search_web(query, max_results=5):
        """Search using DuckDuckGo HTML."""
        urls = []
        try:
            search_url = f"https://duckduckgo.com/html/?q={requests.utils.quote(query)}"
            resp = requests.get(search_url, headers=HEADERS, timeout=15)
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            for link in soup.find_all('a', class_='result__a', limit=max_results):
                href = link.get('href', '')
                if href and href.startswith('http'):
                    urls.append(href)
        except Exception as e:
            log(f"    Search error: {e}", "WARN")
        return urls

    def filter_urls(urls):
        """Filter out social media, government, and aggregator sites."""
        skip = ["sunbiz", "florida.gov", "dos.state", "linkedin", "facebook", "twitter",
                "instagram", "youtube", "yelp", "yellowpages", "bbb.org", "manta.com",
                "zoominfo", "dnb.com", "bloomberg", "crunchbase", "opencorporates",
                "virginia-company", "commerceflorida", "smallbusinessdb", "bizapedia"]
        filtered = []
        for url in urls:
            if not any(s in url.lower() for s in skip):
                filtered.append(url)
        return filtered

    def get_base_domain(url):
        try:
            parsed = urlparse(url)
            return f"https://{parsed.netloc}"
        except:
            return None

    def scrape_emails_from_url(url):
        """Scrape a URL for email addresses."""
        emails = []
        try:
            resp = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
            emails.extend(extract_emails(resp.text))

            # Also try /contact, /about pages
            base = get_base_domain(url)
            if base and len(emails) < 3:
                for page in ["/contact", "/contact-us", "/about", "/about-us"]:
                    try:
                        resp2 = requests.get(base + page, headers=HEADERS, timeout=5)
                        if resp2.status_code == 200:
                            emails.extend(extract_emails(resp2.text))
                    except:
                        pass
        except Exception as e:
            pass
        return list(set(emails))

    def find_emails_for_entity(row, guess_variants=False, max_variant_attempts=10):
        """Try multiple search strategies to find emails for an entity.
        
        Args:
            row: Dictionary with entity data
            guess_variants: If True, try email variants when validation fails
            max_variant_attempts: Max number of variant mutations to try
        """
        entity = row.get('corp_name', row.get('fic_name', ''))
        address = row.get('address_1', '')
        city = row.get('city', '')
        state = row.get('state', 'FL')
        registered_agent = row.get('registered_agent', '')

        all_emails = []
        websites_tried = set()
        website = row.get('website_found', '')

        # Strategy 0: Apollo API (if enabled)
        if use_apollo and entity:
            log(f"    Querying Apollo for: {entity}")
            domain = None
            if website:
                from urllib.parse import urlparse
                parsed = urlparse(website if website.startswith('http') else f'https://{website}')
                domain = parsed.netloc
            apollo_emails = search_apollo(entity, f"{city}, {state}" if city else None, domain)
            if apollo_emails:
                all_emails.extend(apollo_emails)
                log(f"    Apollo found: {len(apollo_emails)} emails")
                if len(all_emails) >= 2:
                    return all_emails[:3], []
            time.sleep(0.5)

        # Strategy 1: Search by company name + location
        if entity:
            query = f'{entity} {city} {state} contact email website'
            log(f"    Query: {query[:60]}...")
            urls = search_web(query, max_results=5)
            urls = filter_urls(urls)

            for url in urls[:3]:
                base = get_base_domain(url)
                if base and base not in websites_tried:
                    websites_tried.add(base)
                    log(f"    Scraping: {base}")
                    emails = scrape_emails_from_url(base)
                    all_emails.extend(emails)
                    if len(all_emails) >= 3:
                        break
                time.sleep(0.3)

        # Strategy 2: Search by address (if no emails yet)
        if not all_emails and address and city:
            query = f'"{address}" {city} {state} business contact'
            log(f"    Query (address): {query[:50]}...")
            urls = search_web(query, max_results=3)
            urls = filter_urls(urls)

            for url in urls[:2]:
                base = get_base_domain(url)
                if base and base not in websites_tried:
                    websites_tried.add(base)
                    log(f"    Scraping: {base}")
                    emails = scrape_emails_from_url(base)
                    all_emails.extend(emails)
                    if emails:
                        break
                time.sleep(0.3)

        # Strategy 3: Search registered agent (if still no emails)
        if not all_emails and registered_agent and registered_agent.lower() != entity.lower():
            query = f'{registered_agent} {city} {state} contact'
            log(f"    Query (agent): {query[:50]}...")
            urls = search_web(query, max_results=2)
            urls = filter_urls(urls)

            for url in urls[:1]:
                base = get_base_domain(url)
                if base and base not in websites_tried:
                    websites_tried.add(base)
                    log(f"    Scraping: {base}")
                    emails = scrape_emails_from_url(base)
                    all_emails.extend(emails)

        # Dedupe and score
        unique_emails = list(set(all_emails))
        scored = [(e, score_email(e)) for e in unique_emails]
        
        # Apply email validation + variant guessing
        validated = []
        attempted_variants = {}  # domain -> set of tried local parts
        variant_attempts_remaining = max_variant_attempts if guess_variants else 0
        
        for email, score in scored:
            domain = email.split('@')[-1].lower() if '@' in email else ''
            local_part = email.rsplit('@', 1)[0] if '@' in email else ''
            valid = True
            validation_failed = False
            
            if verify_mx and domain:
                mx_ok, _ = verify_mx_record(domain)
                if not mx_ok:
                    log(f"    MX validation failed for: {email}")
                    valid = False
                    validation_failed = True
            
            if valid and verify_smtp:
                smtp_ok, _ = smtp_verify(email)
                if not smtp_ok:
                    log(f"    SMTP validation failed for: {email}")
                    valid = False
                    validation_failed = True
            
            if valid:
                validated.append((email, score))
            elif validation_failed and guess_variants and variant_attempts_remaining > 0 and domain and local_part:
                # Try variants of the local part
                if domain not in attempted_variants:
                    attempted_variants[domain] = set()
                
                variants = generate_local_part_variants(local_part)
                variants_tried = 0
                
                for variant_local in variants:
                    if variant_local in attempted_variants[domain]:
                        continue
                    if variants_tried >= max_variant_attempts:
                        break
                    if variant_attempts_remaining <= 0:
                        break
                    
                    attempted_variants[domain].add(variant_local)
                    variant_email = f"{variant_local}@{domain}"
                    variants_tried += 1
                    variant_attempts_remaining -= 1
                    
                    log(f"    Trying variant: {variant_email}")
                    
                    variant_valid = True
                    if verify_mx:
                        mx_ok, _ = verify_mx_record(domain)
                        if not mx_ok:
                            variant_valid = False
                    
                    if variant_valid and verify_smtp:
                        smtp_ok, _ = smtp_verify(variant_email)
                        if not smtp_ok:
                            variant_valid = False
                    
                    if variant_valid:
                        validated.append((variant_email, "LOW"))
                        log(f"    Variant validated: {variant_email}")
                        break
        
        scored = validated
        
        score_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
        scored.sort(key=lambda x: score_order.get(x[1], 3))

        return scored[:3], list(websites_tried)[:1]

    # Read input CSV
    rows = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        orig_fields = list(reader.fieldnames)
        for row in reader:
            rows.append(row)

    # Add email columns
    fieldnames = orig_fields + [
        "email_1", "email_1_score",
        "email_2", "email_2_score",
        "email_3", "email_3_score",
        "website_found"
    ]

    found_count = 0
    for i, row in enumerate(rows):
        # Initialize empty
        row['email_1'] = row['email_1_score'] = ''
        row['email_2'] = row['email_2_score'] = ''
        row['email_3'] = row['email_3_score'] = ''
        row['website_found'] = ''

        if i >= max_leads:
            continue

        entity = row.get('corp_name', row.get('fic_name', ''))
        if not entity:
            continue

        log(f"  [{i+1}/{max_leads}] {entity[:50]}...")

        emails, websites = find_emails_for_entity(row, guess_variants, max_variant_attempts)

        if emails:
            found_count += 1
            for j, (email, score) in enumerate(emails, 1):
                row[f'email_{j}'] = email
                row[f'email_{j}_score'] = score
                log(f"    Found: {email} ({score})")

        if websites:
            row['website_found'] = websites[0]

        time.sleep(1)  # Rate limiting

    # Write output
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return found_count


def send_email(to_email: str, to_name: str, subject: str, body: str, from_email: str, 
               attachment: Path = None, attachment_name: str = None) -> tuple:
    import requests

    wait_for_email_quota()

    # Preferred: Mailgun
    if MAILGUN_API_KEY and MAILGUN_DOMAIN:
        url = f"{MAILGUN_BASE_URL.rstrip('/')}/v3/{MAILGUN_DOMAIN}/messages"

        data = {
            "from": f"MDO3D Leads <{from_email}>",
            "to": f"{to_name} <{to_email}>",
            "subject": subject,
            "text": body,
            "html": body.replace("\n", "<br>"),
        }

        files = []
        if attachment and attachment.exists():
            name = attachment_name or "leads.csv"
            files.append(("attachment", (name, attachment.read_bytes(), "text/csv")))

        try:
            resp = requests.post(url, auth=("api", MAILGUN_API_KEY), data=data, files=files or None, timeout=30)
            if 200 <= resp.status_code < 300:
                mid = (resp.json() or {}).get("id") if resp.headers.get("content-type", "").startswith("application/json") else None
                return True, mid or "ok"
            return False, f"HTTP {resp.status_code}: {resp.text}"
        except Exception as e:
            return False, str(e)

    # Fallback (deprecated): SendGrid
    if not SENDGRID_API_KEY:
        return False, "MAILGUN_API_KEY/MAILGUN_DOMAIN not set (and SENDGRID_API_KEY not set)"

    try:
        headers = {"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"}
        payload = {
            "personalizations": [{"to": [{"email": to_email, "name": to_name}], "subject": subject}],
            "from": {"email": from_email, "name": "MDO3D Leads"},
            "content": [{"type": "text/plain", "value": body}],
        }
        resp = requests.post(SENDGRID_ENDPOINT, headers=headers, json=payload, timeout=30)
        if resp.status_code in [200, 201, 202]:
            return True, resp.headers.get("X-Message-Id", "unknown")
        return False, f"HTTP {resp.status_code}: {resp.text}"
    except Exception as e:
        return False, str(e)


def send_report(profile: dict, leads_csv: Path, enriched_csv: Path, date_str: str) -> List[dict]:
    delivery = profile.get("delivery", {})
    subject_template = delivery.get("subject", "Lead Report - {date}")
    sender_email = profile.get("sender", "leads@mdo3d.com")
    profile_name = profile.get("name", "Lead Report")
    
    email_template = profile.get("email_template", {})
    custom_body = email_template.get("body", "")
    custom_subject = email_template.get("subject", "")
    
    recipients = delivery.get("recipients", [])
    if not recipients:
        if delivery.get("recipient_email"):
            recipients = [{"email": delivery["recipient_email"], "name": delivery.get("recipient_name", "Recipient")}]
    
    results = []
    lead_count = sum(1 for _ in open(leads_csv)) - 1 if leads_csv.exists() else 0
    
    for r in recipients:
        subject = subject_template.replace("{date}", date_str)
        
        if custom_body:
            body = custom_body.format(
                contact_name=r['name'],
                sender_name="MDO3D",
                date=date_str,
                lead_count=lead_count,
                profile_name=profile_name
            )
        else:
            body = f"""Florida Business Lead Report
Generated: {datetime.now().strftime('%Y-%m-%d')}

Hi {r['name']},

Attached is your lead report with {lead_count} businesses matching your criteria.

Profile: {profile_name}

Please review the attached CSV for details including email addresses where found.

---
 MDO3D Leads
 leads@mdo3d.com
"""
        
        success, result = send_email(
            r['email'], r['name'], subject, body, sender_email,
            attachment=enriched_csv, attachment_name=f"leads_{date_str}.csv"
        )
        
        results.append({
            "recipient": r['email'],
            "success": success,
            "message_id": result if success else None,
            "error": result if not success else None
        })
        
        if success:
            log(f"Sent to {r['email']}: {result}")
        else:
            log(f"Failed to {r['email']}: {result}", "ERROR")
    
    return results


def process_profile(name: str, profile: dict, date_str: str, args=None) -> dict:
    result = {"profile": name, "leads": 0, "emails": 0, "sent": [], "errors": []}
    log(f"[{name}] Starting...")

    try:
        # Determine date range from CLI args or profile settings
        if args:
            dates = resolve_date_range(args, profile)
        else:
            # Legacy fallback: use delivery frequency
            delivery = profile.get("delivery", {})
            frequency = delivery.get("frequency", "daily")

            if frequency == "weekly" or frequency == "biweekly":
                dates = get_date_range(7)
            elif frequency == "monthly":
                dates = get_date_range(30)
            else:
                dates = [date_str]

        if len(dates) > 1:
            log(f"[{name}] Downloading {len(dates)} days of filings: {dates[0]} to {dates[-1]}")
        else:
            log(f"[{name}] Downloading filings for {dates[0]}")

        corp_filings, fic_filings = download_and_parse(dates)
        
        if not corp_filings and not fic_filings:
            log(f"[{name}] No files downloaded", "WARN")
            return result
        
        leads = filter_leads(corp_filings, profile)
        log(f"[{name}] Filtered: {len(leads)} corporate leads")
        
        fic_leads = filter_leads(fic_filings, profile)
        if fic_leads:
            log(f"[{name}] FIC leads: {len(fic_leads)}")
            leads.extend(fic_leads)
        
        result["leads"] = len(leads)
        
        if not leads:
            log(f"[{name}] No leads, skipping")
            return result
        
        base_csv = OUTPUT_DIR / f"leads_{name}_{date_str}.csv"
        save_csv(leads, base_csv)
        
        # Only find emails if email_lookup is enabled and not overridden by CLI
        email_lookup = profile.get("email_lookup", False)
        skip_email = args.no_email_lookup if args else False
        enriched_csv = OUTPUT_DIR / f"leads_{name}_{date_str}_enriched.csv"

        # Apply CLI overrides to email_methods if provided
        effective_profile = profile
        if args and (args.verify_mx is not None or args.verify_smtp is not None or args.guess_variants is not None):
            import copy
            effective_profile = copy.deepcopy(profile)
            email_methods = effective_profile.get("email_methods", {})
            if args.verify_mx is not None:
                email_methods["verify_mx"] = args.verify_mx
            if args.verify_smtp is not None:
                email_methods["verify_smtp"] = args.verify_smtp
            if args.guess_variants is not None:
                email_methods["guess_email_variants"] = args.guess_variants
            effective_profile["email_methods"] = email_methods
            
            if args.verify_mx:
                log(f"[{name}] MX validation enabled (CLI override)")
            elif args.verify_mx is False:
                log(f"[{name}] MX validation disabled (CLI override)")
            if args.verify_smtp:
                log(f"[{name}] SMTP validation enabled (CLI override)")
            elif args.verify_smtp is False:
                log(f"[{name}] SMTP validation disabled (CLI override)")
            if args.guess_variants:
                log(f"[{name}] Email variant guessing enabled (CLI override)")
            elif args.guess_variants is False:
                log(f"[{name}] Email variant guessing disabled (CLI override)")

        if email_lookup and not skip_email:
            max_leads = profile.get("max_leads", 30)
            email_count = find_emails_for_leads(base_csv, enriched_csv, max_leads=max_leads, profile=effective_profile)
            result["emails"] = email_count
            log(f"[{name}] Found emails: {email_count}")
        else:
            import shutil
            shutil.copy(base_csv, enriched_csv)
            if skip_email:
                log(f"[{name}] Skipping email lookup (--no-email-lookup)")
            else:
                log(f"[{name}] Skipping email lookup (disabled in profile)")
        
        send_results = send_report(profile, base_csv, enriched_csv, date_str)
        for r in send_results:
            if r["success"]:
                result["sent"].append(r["recipient"])
            else:
                result["errors"].append(f"{r['recipient']}: {r['error']}")

        # Persist leads to database for API access
        # Extract profile_id from profile key (e.g., "customer_abc123" -> "abc123")
        db_profile_id = name.replace("customer_", "") if name.startswith("customer_") else name
        db_count = save_leads_to_db(db_profile_id, enriched_csv, date_str)
        result["db_persisted"] = db_count

    except Exception as e:
        log(f"[{name}] Error: {e}", "ERROR")
        result["errors"].append(str(e))
    
    return result


def run(profile_name: str = None, force: bool = False, date_str: str = None, args=None):
    if date_str is None:
        date_str = get_workday_date()

    log("=" * 60)
    log(f"FL Sunbiz Pipeline - {date_str}")
    log("=" * 60)

    profiles = load_profiles()
    if profile_name:
        if profile_name not in profiles:
            log(f"Profile '{profile_name}' not found")
            return
        profiles = {profile_name: profiles[profile_name]}

    for name, profile in profiles.items():
        if not profile.get("active", False):
            log(f"[{name}] Disabled")
            continue
        if not force and not should_send_today(profile):
            log(f"[{name}] Not scheduled for today")
            continue
        process_profile(name, profile, date_str, args)

    log("Done.")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="FL Sunbiz Lead Pipeline")
    parser.add_argument("--profile", "-p", help="Run specific profile")
    parser.add_argument("--force", "-f", action="store_true", help="Force run")
    parser.add_argument("--date", help="Date YYYYMMDD (single day)")

    # Date range arguments
    parser.add_argument("--date-from", help="Start date YYYYMMDD for date range")
    parser.add_argument("--date-to", help="End date YYYYMMDD (defaults to today)")
    parser.add_argument("--last-week", action="store_true", help="Retrieve last 7 workdays")
    parser.add_argument("--last-month", action="store_true", help="Retrieve last 30 days")

    # Email lookup control
    parser.add_argument("--no-email-lookup", action="store_true", help="Skip email enrichment")

    # Email validation toggles (override profile settings)
    parser.add_argument("--verify-mx", dest="verify_mx", action="store_true", default=None,
                        help="Verify emails have valid MX records")
    parser.add_argument("--no-verify-mx", dest="verify_mx", action="store_false", default=None,
                        help="Skip MX validation")
    parser.add_argument("--verify-smtp", dest="verify_smtp", action="store_true", default=None,
                        help="Verify mailboxes exist via SMTP")
    parser.add_argument("--no-verify-smtp", dest="verify_smtp", action="store_false", default=None,
                        help="Skip SMTP validation")

    # Email variant guessing
    parser.add_argument("--guess-variants", dest="guess_variants", action="store_true", default=None,
                        help="Guess email variants when validation fails")
    parser.add_argument("--no-guess-variants", dest="guess_variants", action="store_false", default=None,
                        help="Skip email variant guessing")

    parser.add_argument("--cron", "-c", choices=["generate", "install", "remove"], help="Manage cron")
    args = parser.parse_args()
    
    if args.cron:
        profiles = load_profiles()
        DAY_MAP = {"monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5}
        
        entries = []
        for name, profile in profiles.items():
            if not profile.get("active", False):
                continue
            delivery = profile.get("delivery", {})
            if not delivery.get("recipients") and not delivery.get("recipient_email"):
                continue
            
            frequency = delivery.get("frequency", "daily")
            day = delivery.get("day_of_week", "monday").lower()
            
            if frequency == "daily":
                cron_time = "0 8 * * 1-5"
            elif frequency == "weekly":
                day_num = DAY_MAP.get(day, 1)
                cron_time = f"0 8 * * {day_num}"
            elif frequency == "biweekly":
                day_num = DAY_MAP.get(day, 1)
                cron_time = f"0 8 * * {day_num}"
            elif frequency == "monthly":
                cron_time = "0 8 1 * *"
            else:
                continue
            
            entry = f'{cron_time} cd {TOOLS_DIR.resolve()} && .venv/bin/python tools/leads/src/runner.py --profile {name} >> tools/leads/logs/{name}.log 2>&1'
            entries.append(entry)
        
        if args.cron == "generate":
            cron_dir = TOOLS_DIR / "cron.d"
            cron_dir.mkdir(exist_ok=True)
            with open(cron_dir / "leads.cron", "w") as f:
                f.write("# FL Sunbiz Lead Generator Crontab\n")
                for e in entries:
                    f.write(e + "\n")
            print(f"Generated crontab at {cron_dir / 'leads.cron'}")
            print("Entries:")
            for e in entries:
                print(f"  {e}")
        
        elif args.cron == "install":
            os.system("crontab -l | grep -v 'ridgefield/tools/leads' > /tmp/current_cron || true")
            for e in entries:
                os.system(f'echo "{e}" >> /tmp/current_cron')
            os.system("crontab /tmp/current_cron")
            os.system("rm /tmp/current_cron")
            print("Crontab installed")
        
        elif args.cron == "remove":
            os.system("crontab -l | grep -v 'ridgefield/tools/leads' | crontab -")
            print("Ridgefield cron entries removed")
    else:
        run(args.profile, args.force, args.date, args)
