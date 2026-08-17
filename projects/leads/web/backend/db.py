"""
SQLite database for user profiles and payment tracking.

Tables:
- users: Firebase UID -> local user record
- profiles: User lead profiles (synced to profiles.json)
- payments: Stripe payment history
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional
from contextlib import contextmanager
from dataclasses import dataclass, asdict
import json

DB_PATH = Path(__file__).parent.parent.parent / "data" / "leads.db"


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
        conn.executescript(SCHEMA)
    return DB_PATH


@contextmanager
def get_db():
    """Context manager for database connection."""
    conn = sqlite3.connect(DB_PATH)
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


# Initialization
if __name__ == "__main__":
    db_path = init_db()
    print(f"Database initialized at {db_path}")
