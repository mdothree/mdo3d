"""
SQLite database for user profiles and payment tracking.

Tables:
- users: Firebase UID -> local user record
- profiles: User lead profiles (synced to profiles.json)
- payments: Stripe payment history
- leads: per-profile delivered leads (legacy pipeline)
- filings: state new-business filings from the state adapters, UNIQUE(state, source_id)
- ingest_runs: one row per (state, source_date) ingest with its row counts
- run_requests: manual profile runs queued by the API (POST /profiles/{id}/run), picked up by the
  scheduler container (runner.py --run-requests on a 1-minute supercronic tick)
- account_access: account-level plan grants (source stripe | promo); no delivery profile involved
- account_redemptions: promo codes redeemed at account level, UNIQUE(code_id, user_id)
- saved_searches: per-user saved filter sets (weekly email only if LEADS_ENABLE_DELIVERY=1)

DB location: $LEADS_DB_PATH, default <leads>/data/leads.db.
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from contextlib import contextmanager
from dataclasses import dataclass, asdict
import json
import os

DB_PATH = Path(os.environ.get("LEADS_DB_PATH") or (Path(__file__).parent.parent.parent / "data" / "leads.db"))


@dataclass
class User:
    id: int
    firebase_uid: str
    email: str
    stripe_customer_id: Optional[str]
    created_at: str
    updated_at: str


@dataclass
class Profile:
    id: str  # UUID for profile_id
    user_id: int
    name: str
    settings: dict  # Full profile config (keywords, counties, etc.)
    active: bool
    paid: bool
    created_at: str
    updated_at: str


@dataclass
class Payment:
    id: int
    user_id: int
    profile_id: str
    stripe_session_id: str
    stripe_payment_intent: Optional[str]
    amount_cents: int
    currency: str
    status: str  # pending, completed, failed, refunded
    created_at: str
    completed_at: Optional[str]


@dataclass
class Code:
    id: int
    code: str
    max_uses: int
    uses: int
    created_at: str
    expires_at: Optional[str]


@dataclass
class Lead:
    id: int
    profile_id: str
    doc_number: str
    corp_name: Optional[str]
    filing_type: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    file_date: Optional[str]
    registered_agent: Optional[str]
    email_1: Optional[str]
    email_1_score: Optional[str]
    email_2: Optional[str]
    email_2_score: Optional[str]
    website_found: Optional[str]
    source_date: Optional[str]
    created_at: str


SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    stripe_customer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    settings TEXT NOT NULL,  -- JSON blob
    active INTEGER NOT NULL DEFAULT 0,
    paid INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    profile_id TEXT NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    stripe_payment_intent TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id TEXT NOT NULL,
    doc_number TEXT NOT NULL,
    corp_name TEXT,
    filing_type TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    file_date TEXT,
    registered_agent TEXT,
    email_1 TEXT,
    email_1_score TEXT,
    email_2 TEXT,
    email_2_score TEXT,
    website_found TEXT,
    source_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    UNIQUE(profile_id, doc_number)
);

CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    uses INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT
);

CREATE TABLE IF NOT EXISTS code_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL,
    profile_id TEXT NOT NULL,
    redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (code_id) REFERENCES codes(id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id),
    UNIQUE(code_id, profile_id)
);

CREATE TABLE IF NOT EXISTS filings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT NOT NULL,
    source_id TEXT NOT NULL,
    entity TEXT NOT NULL,
    filing_type TEXT,
    entity_kind TEXT NOT NULL DEFAULT 'other',
    filed_date TEXT,              -- ISO YYYY-MM-DD
    status TEXT,
    active INTEGER,               -- 1/0, NULL when the source status is unknown
    county TEXT,
    registered_agent TEXT,
    address_1 TEXT,
    address_2 TEXT,
    city TEXT,
    address_state TEXT,
    zip_code TEXT,
    naics_guess TEXT,
    naics_basis TEXT,
    contacts TEXT NOT NULL DEFAULT '[]',   -- JSON list of verified public contacts only
    source_date TEXT,             -- feed date YYYYMMDD
    raw TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(state, source_id)
);

CREATE TABLE IF NOT EXISTS ingest_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT NOT NULL,
    source_date TEXT NOT NULL,
    rows INTEGER NOT NULL,
    new_rows INTEGER NOT NULL,
    status TEXT NOT NULL,          -- ok | empty | error
    detail TEXT,
    ran_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS run_requests (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',   -- queued | running | done | error
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    started_at TEXT,
    finished_at TEXT,
    leads INTEGER,
    delivery TEXT,                 -- sent | disabled | none (set when the run finishes)
    error TEXT
);

CREATE TABLE IF NOT EXISTS account_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    source TEXT NOT NULL,          -- stripe | promo
    status TEXT NOT NULL,          -- pending | active | canceled
    states TEXT NOT NULL,          -- JSON list of state codes in the bundle
    plan_name TEXT,
    code_id INTEGER,
    stripe_session_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    renews_at TEXT,
    expires_at TEXT,               -- NULL = no end date
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    redeemed_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(code_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_searches (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    query TEXT NOT NULL,           -- JSON: the filter set as the client sent it
    filters TEXT NOT NULL,         -- JSON: resolved DB filters (no states/dates); used by the weekly job
    cadence TEXT NOT NULL DEFAULT 'weekly',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_run_at TEXT,
    last_sent_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_account_access_user ON account_access(user_id, status);
CREATE INDEX IF NOT EXISTS idx_account_access_sub ON account_access(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_filings_first_seen ON filings(first_seen);
CREATE INDEX IF NOT EXISTS idx_run_requests_profile ON run_requests(profile_id, requested_at);
CREATE INDEX IF NOT EXISTS idx_run_requests_status ON run_requests(status, requested_at);
CREATE INDEX IF NOT EXISTS idx_filings_state_date ON filings(state, filed_date);
CREATE INDEX IF NOT EXISTS idx_filings_kind ON filings(entity_kind);
CREATE INDEX IF NOT EXISTS idx_filings_county ON filings(county);
CREATE INDEX IF NOT EXISTS idx_ingest_runs_state ON ingest_runs(state, source_date);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_leads_profile ON leads(profile_id);
CREATE INDEX IF NOT EXISTS idx_leads_date ON leads(source_date);
CREATE INDEX IF NOT EXISTS idx_codes_code ON codes(code);
"""


def init_db():
    """Initialize database with schema."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        # WAL: the API container reads while the scheduler container's ingest writes.
        conn.execute("PRAGMA journal_mode=WAL")
        conn.executescript(SCHEMA)
    return DB_PATH


@contextmanager
def get_db():
    """Context manager for database connection."""
    conn = sqlite3.connect(DB_PATH, timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# User operations

def get_user_by_firebase_uid(firebase_uid: str) -> Optional[User]:
    """Get user by Firebase UID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE firebase_uid = ?",
            (firebase_uid,)
        ).fetchone()
        if row:
            return User(**dict(row))
    return None


def create_user(firebase_uid: str, email: str) -> User:
    """Create new user from Firebase auth."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO users (firebase_uid, email, created_at, updated_at)
               VALUES (?, ?, ?, ?)""",
            (firebase_uid, email, now, now)
        )
        return User(
            id=cursor.lastrowid,
            firebase_uid=firebase_uid,
            email=email,
            stripe_customer_id=None,
            created_at=now,
            updated_at=now
        )


def update_user_stripe_customer(user_id: int, stripe_customer_id: str):
    """Update user's Stripe customer ID."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        conn.execute(
            """UPDATE users SET stripe_customer_id = ?, updated_at = ?
               WHERE id = ?""",
            (stripe_customer_id, now, user_id)
        )


# Profile operations

def get_profile(profile_id: str) -> Optional[Profile]:
    """Get profile by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM profiles WHERE id = ?",
            (profile_id,)
        ).fetchone()
        if row:
            data = dict(row)
            data['settings'] = json.loads(data['settings'])
            data['active'] = bool(data['active'])
            data['paid'] = bool(data['paid'])
            return Profile(**data)
    return None


def get_profiles_by_user(user_id: int) -> list[Profile]:
    """Get all profiles for a user."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
        profiles = []
        for row in rows:
            data = dict(row)
            data['settings'] = json.loads(data['settings'])
            data['active'] = bool(data['active'])
            data['paid'] = bool(data['paid'])
            profiles.append(Profile(**data))
        return profiles


def create_profile(profile_id: str, user_id: int, name: str, settings: dict) -> Profile:
    """Create new profile."""
    now = datetime.utcnow().isoformat()
    settings_json = json.dumps(settings)
    with get_db() as conn:
        conn.execute(
            """INSERT INTO profiles (id, user_id, name, settings, active, paid, created_at, updated_at)
               VALUES (?, ?, ?, ?, 0, 0, ?, ?)""",
            (profile_id, user_id, name, settings_json, now, now)
        )
        return Profile(
            id=profile_id,
            user_id=user_id,
            name=name,
            settings=settings,
            active=False,
            paid=False,
            created_at=now,
            updated_at=now
        )


def update_profile(profile_id: str, name: str = None, settings: dict = None,
                   active: bool = None, paid: bool = None):
    """Update profile fields."""
    now = datetime.utcnow().isoformat()
    updates = ["updated_at = ?"]
    params = [now]

    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if settings is not None:
        updates.append("settings = ?")
        params.append(json.dumps(settings))
    if active is not None:
        updates.append("active = ?")
        params.append(1 if active else 0)
    if paid is not None:
        updates.append("paid = ?")
        params.append(1 if paid else 0)

    params.append(profile_id)

    with get_db() as conn:
        conn.execute(
            f"UPDATE profiles SET {', '.join(updates)} WHERE id = ?",
            params
        )


def delete_profile(profile_id: str):
    """Delete a profile."""
    with get_db() as conn:
        conn.execute("DELETE FROM profiles WHERE id = ?", (profile_id,))


# Payment operations

def create_payment(user_id: int, profile_id: str, stripe_session_id: str,
                   amount_cents: int, currency: str = "usd") -> Payment:
    """Create payment record for Stripe checkout session."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO payments (user_id, profile_id, stripe_session_id, amount_cents, currency, status, created_at)
               VALUES (?, ?, ?, ?, ?, 'pending', ?)""",
            (user_id, profile_id, stripe_session_id, amount_cents, currency, now)
        )
        return Payment(
            id=cursor.lastrowid,
            user_id=user_id,
            profile_id=profile_id,
            stripe_session_id=stripe_session_id,
            stripe_payment_intent=None,
            amount_cents=amount_cents,
            currency=currency,
            status="pending",
            created_at=now,
            completed_at=None
        )


def complete_payment(stripe_session_id: str, stripe_payment_intent: str = None):
    """Mark payment as completed and activate profile."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        # Update payment
        conn.execute(
            """UPDATE payments SET status = 'completed', stripe_payment_intent = ?, completed_at = ?
               WHERE stripe_session_id = ?""",
            (stripe_payment_intent, now, stripe_session_id)
        )

        # Get profile_id from payment
        row = conn.execute(
            "SELECT profile_id FROM payments WHERE stripe_session_id = ?",
            (stripe_session_id,)
        ).fetchone()

        if row:
            # Activate and mark profile as paid
            conn.execute(
                "UPDATE profiles SET paid = 1, active = 1, updated_at = ? WHERE id = ?",
                (now, row['profile_id'])
            )
            return row['profile_id']
    return None


def get_payment_by_session(stripe_session_id: str) -> Optional[Payment]:
    """Get payment by Stripe session ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM payments WHERE stripe_session_id = ?",
            (stripe_session_id,)
        ).fetchone()
        if row:
            return Payment(**dict(row))
    return None


# Lead operations

def create_lead(profile_id: str, lead_data: dict) -> Lead:
    """Create or update a lead (upsert by profile_id + doc_number)."""
    now = datetime.utcnow().isoformat()

    with get_db() as conn:
        cursor = conn.execute(
            """INSERT INTO leads (
                profile_id, doc_number, corp_name, filing_type, address, city, state,
                zip_code, file_date, registered_agent, email_1, email_1_score,
                email_2, email_2_score, website_found, source_date, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(profile_id, doc_number) DO UPDATE SET
                email_1 = excluded.email_1,
                email_1_score = excluded.email_1_score,
                email_2 = excluded.email_2,
                email_2_score = excluded.email_2_score,
                website_found = excluded.website_found
            """,
            (
                profile_id,
                lead_data.get('doc_number'),
                lead_data.get('corp_name'),
                lead_data.get('filing_type'),
                lead_data.get('address') or lead_data.get('address_1'),
                lead_data.get('city'),
                lead_data.get('state'),
                lead_data.get('zip_code'),
                lead_data.get('file_date'),
                lead_data.get('registered_agent'),
                lead_data.get('email_1'),
                lead_data.get('email_1_score'),
                lead_data.get('email_2'),
                lead_data.get('email_2_score'),
                lead_data.get('website_found'),
                lead_data.get('source_date'),
                now
            )
        )
        return Lead(
            id=cursor.lastrowid,
            profile_id=profile_id,
            doc_number=lead_data.get('doc_number'),
            corp_name=lead_data.get('corp_name'),
            filing_type=lead_data.get('filing_type'),
            address=lead_data.get('address') or lead_data.get('address_1'),
            city=lead_data.get('city'),
            state=lead_data.get('state'),
            zip_code=lead_data.get('zip_code'),
            file_date=lead_data.get('file_date'),
            registered_agent=lead_data.get('registered_agent'),
            email_1=lead_data.get('email_1'),
            email_1_score=lead_data.get('email_1_score'),
            email_2=lead_data.get('email_2'),
            email_2_score=lead_data.get('email_2_score'),
            website_found=lead_data.get('website_found'),
            source_date=lead_data.get('source_date'),
            created_at=now
        )


def get_leads_by_profile(profile_id: str, limit: int = 50, offset: int = 0) -> list[Lead]:
    """Get leads for a profile with pagination."""
    with get_db() as conn:
        rows = conn.execute(
            """SELECT * FROM leads WHERE profile_id = ?
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?""",
            (profile_id, limit, offset)
        ).fetchall()
        return [Lead(**dict(row)) for row in rows]


def get_leads_count(profile_id: str) -> int:
    """Get total count of leads for a profile."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as count FROM leads WHERE profile_id = ?",
            (profile_id,)
        ).fetchone()
        return row['count'] if row else 0


def get_leads_stats(profile_id: str) -> dict:
    """Get lead statistics for a profile."""
    with get_db() as conn:
        # Total count
        total = conn.execute(
            "SELECT COUNT(*) as count FROM leads WHERE profile_id = ?",
            (profile_id,)
        ).fetchone()['count']

        # Count with emails
        enriched = conn.execute(
            "SELECT COUNT(*) as count FROM leads WHERE profile_id = ? AND email_1 IS NOT NULL AND email_1 != ''",
            (profile_id,)
        ).fetchone()['count']

        # Count by filing type
        by_type = conn.execute(
            """SELECT filing_type, COUNT(*) as count FROM leads
               WHERE profile_id = ? GROUP BY filing_type""",
            (profile_id,)
        ).fetchall()

        # Recent leads (last 7 days)
        recent = conn.execute(
            """SELECT COUNT(*) as count FROM leads
               WHERE profile_id = ? AND created_at > datetime('now', '-7 days')""",
            (profile_id,)
        ).fetchone()['count']

        return {
            'total': total,
            'enriched': enriched,
            'pending': total - enriched,
            'recent': recent,
            'by_filing_type': {row['filing_type']: row['count'] for row in by_type if row['filing_type']},
        }


# Code operations

def get_code(code: str) -> Optional[Code]:
    """Get code by code string."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM codes WHERE code = ?",
            (code.upper(),)
        ).fetchone()
        if row:
            return Code(**dict(row))
    return None


def validate_code(code: str, profile_id: str) -> tuple[bool, str]:
    """Validate a code for redemption. Returns (valid, message)."""
    code_obj = get_code(code)

    if not code_obj:
        return False, "Invalid code"

    # Check expiration
    if code_obj.expires_at:
        expires = datetime.fromisoformat(code_obj.expires_at)
        if datetime.utcnow() > expires:
            return False, "Code has expired"

    # Check uses
    if code_obj.uses >= code_obj.max_uses:
        return False, "Code has reached maximum uses"

    # Check if already redeemed for this profile
    with get_db() as conn:
        existing = conn.execute(
            "SELECT 1 FROM code_redemptions WHERE code_id = ? AND profile_id = ?",
            (code_obj.id, profile_id)
        ).fetchone()
        if existing:
            return False, "Code already redeemed for this profile"

    return True, "Code is valid"


def redeem_code(code: str, profile_id: str) -> tuple[bool, str]:
    """Redeem a code for a profile. Returns (success, message)."""
    valid, message = validate_code(code, profile_id)
    if not valid:
        return False, message

    code_obj = get_code(code)
    now = datetime.utcnow().isoformat()

    with get_db() as conn:
        # Increment uses
        conn.execute(
            "UPDATE codes SET uses = uses + 1 WHERE id = ?",
            (code_obj.id,)
        )

        # Record redemption
        conn.execute(
            "INSERT INTO code_redemptions (code_id, profile_id, redeemed_at) VALUES (?, ?, ?)",
            (code_obj.id, profile_id, now)
        )

        # Activate profile (paid=1, active=1)
        conn.execute(
            "UPDATE profiles SET paid = 1, active = 1, updated_at = ? WHERE id = ?",
            (now, profile_id)
        )

    return True, "Code redeemed successfully"


def create_code(code: str, max_uses: int = 1, expires_at: str = None) -> Code:
    """Create a new redemption code."""
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.execute(
            "INSERT INTO codes (code, max_uses, uses, created_at, expires_at) VALUES (?, ?, 0, ?, ?)",
            (code.upper(), max_uses, now, expires_at)
        )
        return Code(
            id=cursor.lastrowid,
            code=code.upper(),
            max_uses=max_uses,
            uses=0,
            created_at=now,
            expires_at=expires_at
        )


# Filings (state adapters)

FILING_COLUMNS = (
    "state", "source_id", "entity", "filing_type", "entity_kind", "filed_date", "status", "active",
    "county", "registered_agent", "address_1", "address_2", "city", "address_state", "zip_code",
    "naics_guess", "naics_basis", "contacts", "source_date", "raw",
)


def upsert_filings(rows: list[dict]) -> int:
    """Insert or update filing rows keyed on (state, source_id). Returns the number of new rows.

    Rows are the dicts from adapters.Filing.to_row(). An existing row is updated in place (status,
    address, etc. may change between feed dates); `first_seen` is kept.
    """
    if not rows:
        return 0
    cols = ", ".join(FILING_COLUMNS)
    marks = ", ".join("?" for _ in FILING_COLUMNS)
    updates = ", ".join(f"{c} = excluded.{c}" for c in FILING_COLUMNS if c not in ("state", "source_id"))
    sql = (f"INSERT INTO filings ({cols}) VALUES ({marks}) "
           f"ON CONFLICT(state, source_id) DO UPDATE SET {updates}, updated_at = datetime('now')")
    with get_db() as conn:
        before = conn.execute("SELECT COUNT(*) FROM filings").fetchone()[0]
        conn.executemany(sql, [tuple(r.get(c) for c in FILING_COLUMNS) for r in rows])
        after = conn.execute("SELECT COUNT(*) FROM filings").fetchone()[0]
    return after - before


def record_ingest_run(state: str, source_date: str, rows: int, new_rows: int,
                      status: str, detail: Optional[str] = None):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO ingest_runs (state, source_date, rows, new_rows, status, detail) VALUES (?, ?, ?, ?, ?, ?)",
            (state, source_date, rows, new_rows, status, detail),
        )


def _filing_where(states=None, county=None, filing_type=None, entity_kind=None, keywords=None,
                  exclude_keywords=None, must_contain=None, date_from=None, date_to=None, active_only=True,
                  first_seen_after=None):
    where, params = [], []
    if states is not None:
        states = [s.upper() for s in states]
        if not states:
            return "1 = 0", []
        where.append(f"state IN ({', '.join('?' for _ in states)})")
        params.extend(states)
    if county:
        where.append("UPPER(county) = ?")
        params.append(county.strip().upper())
    if filing_type:
        types = [t.strip().upper() for t in filing_type.split(",") if t.strip()]
        where.append(f"UPPER(filing_type) IN ({', '.join('?' for _ in types)})")
        params.extend(types)
    if entity_kind:
        kinds = [k.strip().lower() for k in entity_kind.split(",") if k.strip()]
        where.append(f"entity_kind IN ({', '.join('?' for _ in kinds)})")
        params.extend(kinds)
    if keywords:
        where.append("(" + " OR ".join("LOWER(entity) LIKE ?" for _ in keywords) + ")")
        params.extend(f"%{k.lower()}%" for k in keywords)
    if must_contain:
        where.append("LOWER(entity) LIKE ?")
        params.append(f"%{must_contain.lower()}%")
    for k in exclude_keywords or []:
        where.append("LOWER(entity) NOT LIKE ?")
        params.append(f"%{k.lower()}%")
    if date_from:
        where.append("filed_date >= ?")
        params.append(date_from)
    if date_to:
        where.append("filed_date <= ?")
        params.append(date_to)
    if active_only:
        where.append("active = 1")
    if first_seen_after:
        where.append("first_seen > ?")
        params.append(first_seen_after)
    return (" AND ".join(where) or "1 = 1"), params


PUBLIC_FILING_FIELDS = (
    "state", "source_id", "entity", "filing_type", "entity_kind", "filed_date", "status", "county",
    "registered_agent", "address_1", "address_2", "city", "address_state", "zip_code", "naics_guess",
    "naics_basis", "contacts", "source_date",
)


def search_filings(limit: int = 50, offset: int = 0, **filters) -> tuple[list[dict], int]:
    """Filtered filings, newest filed first. Returns (rows, total matching)."""
    where, params = _filing_where(**filters)
    fields = ", ".join(PUBLIC_FILING_FIELDS)
    with get_db() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM filings WHERE {where}", params).fetchone()[0]
        rows = conn.execute(
            f"SELECT {fields} FROM filings WHERE {where} "
            "ORDER BY filed_date DESC, state, source_id LIMIT ? OFFSET ?",
            [*params, limit, offset],
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["contacts"] = json.loads(d.get("contacts") or "[]")
        out.append(d)
    return out, total


def filings_coverage() -> list[dict]:
    """Per-state counts and freshness (public: no filing content)."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT state, COUNT(*) AS filings, MAX(filed_date) AS latest_filed_date, "
            "MAX(source_date) AS latest_source_date FROM filings GROUP BY state ORDER BY state"
        ).fetchall()
        runs = {
            r["state"]: dict(r) for r in conn.execute(
                "SELECT state, MAX(ran_at) AS last_ingest_at FROM ingest_runs GROUP BY state"
            ).fetchall()
        }
    out = []
    for r in rows:
        d = dict(r)
        d["last_ingest_at"] = runs.get(d["state"], {}).get("last_ingest_at")
        out.append(d)
    return out


def latest_ingest_runs(limit: int = 20) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute(
            "SELECT state, source_date, rows, new_rows, status, ran_at FROM ingest_runs "
            "ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


# Entitlements (paid-only: no free tier; promo codes are the early-access lever)

DEFAULT_ENTITLED_STATES = ("FL",)  # a paid profile with no `states` field covers the original FL product


def entitled_states(user_id: int) -> set[str]:
    """States the user may search: the union of `states` over their PAID profiles and their active
    account-level grants (account_access: Stripe plan or promo code).

    A profile is paid only via a completed Stripe checkout (webhook) or a redeemed promo code.
    No paid profile -> empty set -> the API refuses (fails closed).
    """
    states: set[str] = set()
    for p in get_profiles_by_user(user_id):
        if not p.paid:
            continue
        s = p.settings.get("states") or list(DEFAULT_ENTITLED_STATES)
        states.update(x.strip().upper() for x in s if isinstance(x, str) and x.strip())
    for g in active_account_access(user_id):
        states.update(g["states"])
    return states


# Runner integration

def get_all_active_profiles() -> dict:
    """Get all active, paid profiles for runner.py.

    Returns profiles in the format expected by runner.py:
    {
        "customer_{id}": {settings dict with name, active, etc.}
    }
    """
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, settings FROM profiles WHERE active = 1 AND paid = 1"
        ).fetchall()

        result = {}
        for row in rows:
            settings = json.loads(row['settings'])
            # Merge name and flags into settings for runner.py compatibility
            settings['name'] = row['name']
            settings['active'] = True
            settings['paid'] = True
            result[f"customer_{row['id']}"] = settings
        return result


# Manual runs (API enqueues, scheduler container executes)

RUN_REQUEST_FIELDS = ("id", "profile_id", "status", "requested_at", "started_at", "finished_at",
                      "leads", "delivery", "error")


def _utc(dt: Optional[datetime] = None) -> str:
    # Same text format as SQLite datetime('now') so comparisons in SQL are lexical-safe.
    return (dt or datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S")


def create_run_request(profile_id: str, user_id: int, min_interval_s: int = 600) -> tuple[Optional[dict], int]:
    """Queue a manual run unless one was requested for this profile in the last `min_interval_s`.

    Returns (run, 0) on success, or (None, retry_after_seconds) when rate-limited. The check and the
    insert share one IMMEDIATE transaction, so two concurrent requests cannot both pass.
    """
    from uuid import uuid4
    now = datetime.utcnow()
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        last = conn.execute(
            "SELECT MAX(requested_at) FROM run_requests WHERE profile_id = ?", (profile_id,)
        ).fetchone()[0]
        if last:
            elapsed = (now - datetime.strptime(last, "%Y-%m-%d %H:%M:%S")).total_seconds()
            if elapsed < min_interval_s:
                return None, max(1, int(min_interval_s - elapsed + 0.999))
        run_id = uuid4().hex
        conn.execute(
            "INSERT INTO run_requests (id, profile_id, user_id, status, requested_at) VALUES (?, ?, ?, 'queued', ?)",
            (run_id, profile_id, user_id, _utc(now)),
        )
    return get_run_request(run_id), 0


def get_run_request(run_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM run_requests WHERE id = ?", (run_id,)).fetchone()
    return dict(row) if row else None


def claim_next_run_request() -> Optional[dict]:
    """Atomically move the oldest queued request to running and return it (None when the queue is empty)."""
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT id FROM run_requests WHERE status = 'queued' ORDER BY requested_at, rowid LIMIT 1"
        ).fetchone()
        if not row:
            return None
        conn.execute("UPDATE run_requests SET status = 'running', started_at = ? WHERE id = ?",
                     (_utc(), row["id"]))
    return get_run_request(row["id"])


def finish_run_request(run_id: str, status: str, leads: Optional[int] = None,
                       delivery: Optional[str] = None, error: Optional[str] = None):
    with get_db() as conn:
        conn.execute(
            "UPDATE run_requests SET status = ?, finished_at = ?, leads = ?, delivery = ?, error = ? WHERE id = ?",
            (status, _utc(), leads, delivery, (error or None) and error[:500], run_id),
        )


def fail_stale_run_requests(older_than_s: int) -> int:
    """Mark `running` requests started more than `older_than_s` ago as errors (worker died mid-run)."""
    cutoff = _utc(datetime.utcnow() - timedelta(seconds=older_than_s))
    with get_db() as conn:
        cur = conn.execute(
            "UPDATE run_requests SET status = 'error', finished_at = ?, error = 'worker stopped (stale run)' "
            "WHERE status = 'running' AND started_at < ?", (_utc(), cutoff))
        return cur.rowcount


def filings_for_source_dates(states: list[str], source_dates: list[str]) -> list[dict]:
    """Stored filing rows for these states and feed dates (YYYYMMDD), for runs that use the DB, not the sources."""
    states = [s.upper() for s in states if s]
    if not states or not source_dates:
        return []
    sql = (f"SELECT * FROM filings WHERE state IN ({', '.join('?' for _ in states)}) "
           f"AND source_date IN ({', '.join('?' for _ in source_dates)}) ORDER BY state, source_id")
    with get_db() as conn:
        return [dict(r) for r in conn.execute(sql, [*states, *source_dates]).fetchall()]


# Account-level access (GET /v1/account, POST /v1/access/redeem, POST /v1/checkout).
# A grant here never creates a delivery profile, so it never schedules email.

def get_user_by_id(user_id: int) -> Optional[User]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return User(**dict(row)) if row else None


def _access_row(row) -> dict:
    d = dict(row)
    d["states"] = json.loads(d.get("states") or "[]")
    return d


def active_account_access(user_id: int, now: Optional[datetime] = None) -> list[dict]:
    """Active, unexpired grants for a user (Stripe first, then newest)."""
    ts = _utc(now)
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM account_access WHERE user_id = ? AND status = 'active' "
            "AND (expires_at IS NULL OR expires_at > ?) "
            "ORDER BY CASE source WHEN 'stripe' THEN 0 ELSE 1 END, id DESC",
            (user_id, ts),
        ).fetchall()
    return [_access_row(r) for r in rows]


def paid_profile_source(user_id: int) -> Optional[str]:
    """Legacy per-profile entitlement: 'stripe' if a paid profile has a completed payment, else 'promo'."""
    with get_db() as conn:
        paid = conn.execute("SELECT 1 FROM profiles WHERE user_id = ? AND paid = 1 LIMIT 1", (user_id,)).fetchone()
        if not paid:
            return None
        stripe_paid = conn.execute(
            "SELECT 1 FROM payments p JOIN profiles f ON f.id = p.profile_id "
            "WHERE f.user_id = ? AND f.paid = 1 AND p.status = 'completed' LIMIT 1", (user_id,)).fetchone()
    return "stripe" if stripe_paid else "promo"


def redeem_code_for_account(code: str, user_id: int, states: list[str],
                            access_days: int = 0) -> tuple[bool, str]:
    """Redeem a promo code for the whole account (no profile, no delivery). Returns (success, message).

    Validation, the use counter and the grant share one IMMEDIATE transaction, so concurrent redemptions
    cannot exceed max_uses.
    """
    norm = (code or "").strip().upper()
    if not norm:
        return False, "Enter a promo code"
    now = datetime.utcnow()
    with get_db() as conn:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute("SELECT * FROM codes WHERE code = ?", (norm,)).fetchone()
        if not row:
            return False, "Invalid code"
        if row["expires_at"] and now > datetime.fromisoformat(row["expires_at"]):
            return False, "Code has expired"
        if conn.execute("SELECT 1 FROM account_redemptions WHERE code_id = ? AND user_id = ?",
                        (row["id"], user_id)).fetchone():
            return False, "Code already redeemed for this account"
        cur = conn.execute("UPDATE codes SET uses = uses + 1 WHERE id = ? AND uses < max_uses", (row["id"],))
        if cur.rowcount != 1:
            return False, "Code has reached maximum uses"
        conn.execute("INSERT INTO account_redemptions (code_id, user_id, redeemed_at) VALUES (?, ?, ?)",
                     (row["id"], user_id, _utc(now)))
        expires = _utc(now + timedelta(days=access_days)) if access_days and access_days > 0 else None
        conn.execute(
            "INSERT INTO account_access (user_id, source, status, states, code_id, expires_at, created_at, updated_at) "
            "VALUES (?, 'promo', 'active', ?, ?, ?, ?, ?)",
            (user_id, json.dumps(sorted({s.upper() for s in states})), row["id"], expires, _utc(now), _utc(now)),
        )
    return True, "Code accepted. Your access is active."


def create_pending_checkout(user_id: int, stripe_session_id: str, states: list[str],
                            plan_name: Optional[str] = None) -> None:
    now = _utc()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO account_access (user_id, source, status, states, plan_name, stripe_session_id, "
            "created_at, updated_at) VALUES (?, 'stripe', 'pending', ?, ?, ?, ?, ?)",
            (user_id, json.dumps(sorted({s.upper() for s in states})), plan_name, stripe_session_id, now, now),
        )


def activate_checkout(stripe_session_id: str, stripe_subscription_id: Optional[str] = None) -> Optional[int]:
    """checkout.session.completed for an account checkout: pending -> active (idempotent).

    Only sessions this API created (a pending/active row with this id) are honoured. Returns the user id.
    """
    with get_db() as conn:
        row = conn.execute("SELECT id, user_id, status FROM account_access WHERE stripe_session_id = ?",
                           (stripe_session_id,)).fetchone()
        if not row:
            return None
        if row["status"] == "pending":
            conn.execute(
                "UPDATE account_access SET status = 'active', stripe_subscription_id = COALESCE(?, stripe_subscription_id), "
                "updated_at = ? WHERE id = ?", (stripe_subscription_id, _utc(), row["id"]))
        return row["user_id"]


def update_subscription(stripe_subscription_id: str, status: Optional[str] = None,
                        renews_at: Optional[str] = None) -> int:
    """Apply a customer.subscription.* event to the account grant(s) for that subscription."""
    if not stripe_subscription_id:
        return 0
    sets, params = ["updated_at = ?"], [_utc()]
    if status:
        sets.append("status = ?")
        params.append(status)
    if renews_at is not None:
        sets.append("renews_at = ?")
        params.append(renews_at)
    with get_db() as conn:
        cur = conn.execute(
            f"UPDATE account_access SET {', '.join(sets)} WHERE stripe_subscription_id = ? AND status != 'pending'",
            [*params, stripe_subscription_id])
        return cur.rowcount


# Saved searches (weekly email of new filings; sent only when LEADS_ENABLE_DELIVERY=1)

SAVED_SEARCH_FIELDS = ("id", "name", "query", "cadence", "created_at", "last_sent_at")


def _saved_row(row) -> dict:
    d = dict(row)
    d["query"] = json.loads(d.get("query") or "{}")
    d["filters"] = json.loads(d.get("filters") or "{}")
    return d


def list_saved_searches(user_id: int) -> list[dict]:
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC, rowid DESC",
                            (user_id,)).fetchall()
    return [_saved_row(r) for r in rows]


def count_saved_searches(user_id: int) -> int:
    with get_db() as conn:
        return conn.execute("SELECT COUNT(*) FROM saved_searches WHERE user_id = ?", (user_id,)).fetchone()[0]


def create_saved_search(user_id: int, name: str, query: dict, filters: dict, cadence: str = "weekly") -> dict:
    from uuid import uuid4
    sid = uuid4().hex[:16]
    with get_db() as conn:
        conn.execute(
            "INSERT INTO saved_searches (id, user_id, name, query, filters, cadence, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (sid, user_id, name, json.dumps(query), json.dumps(filters), cadence, _utc()))
    return get_saved_search(sid)


def get_saved_search(search_id: str) -> Optional[dict]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM saved_searches WHERE id = ?", (search_id,)).fetchone()
    return _saved_row(row) if row else None


def delete_saved_search(search_id: str, user_id: int) -> bool:
    with get_db() as conn:
        cur = conn.execute("DELETE FROM saved_searches WHERE id = ? AND user_id = ?", (search_id, user_id))
        return cur.rowcount == 1


def due_saved_searches(interval_days: int = 7, now: Optional[datetime] = None) -> list[dict]:
    """Saved searches whose last weekly run is at least `interval_days` old (or that never ran)."""
    cutoff = _utc((now or datetime.utcnow()) - timedelta(days=interval_days))
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM saved_searches WHERE cadence = 'weekly' AND COALESCE(last_run_at, created_at) <= ? "
            "ORDER BY COALESCE(last_run_at, created_at)", (cutoff,)).fetchall()
    return [_saved_row(r) for r in rows]


def mark_saved_search_run(search_id: str, sent: bool, now: Optional[datetime] = None) -> None:
    ts = _utc(now)
    with get_db() as conn:
        if sent:
            conn.execute("UPDATE saved_searches SET last_run_at = ?, last_sent_at = ? WHERE id = ?", (ts, ts, search_id))
        else:
            conn.execute("UPDATE saved_searches SET last_run_at = ? WHERE id = ?", (ts, search_id))


def filing_type_counts(state: str) -> list[dict]:
    """Distinct filing_type values stored for a state, with counts (reference data, no filing content)."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT filing_type, MIN(entity_kind) AS entity_kind, COUNT(*) AS filings FROM filings "
            "WHERE state = ? AND filing_type IS NOT NULL AND filing_type != '' GROUP BY filing_type",
            (state.upper(),)).fetchall()
    return [dict(r) for r in rows]


# Initialization
if __name__ == "__main__":
    db_path = init_db()
    print(f"Database initialized at {db_path}")
