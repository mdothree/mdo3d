#!/usr/bin/env python3
"""
Email Validator Module

Standalone email validation with MX and SMTP verification.
Can be used as a module or CLI tool.

Usage:
    # As module
    from src.validate_email import validate_email, is_real_email
    result = validate_email("test@example.com", verify_mx=True, verify_smtp=True)
    
    # As CLI
    python src/validate_email.py test@example.com
    python src/validate_email.py test@example.com --verify-mx --verify-smtp
    python src/validate_email.py - < input.txt     # Batch from stdin
"""

import re
import smtplib
import socket
from email.utils import parseaddr
from dataclasses import dataclass
from typing import Optional
import sys
import argparse

SKIP_DOMAINS = {"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
                "icloud.com", "me.com", "live.com", "msn.com"}

SKIP_PATTERNS = ["noreply", "no-reply", "example", "test", "sentry", "wix", "godaddy",
                 "wordpress", "squarespace", "mailchimp", "constantcontact", "donotreply",
                 "no.reply", "invalid", "placeholder"]


@dataclass
class ValidationResult:
    email: str
    is_valid_format: bool
    domain: str
    is_disposable: bool
    mx_valid: Optional[bool] = None
    smtp_valid: Optional[bool] = None
    errors: list = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
    
    @property
    def is_real_email(self) -> bool:
        if not self.is_valid_format:
            return False
        if self.is_disposable:
            return False
        if self.mx_valid is False:
            return False
        if self.smtp_valid is False:
            return False
        return True
    
    def to_dict(self) -> dict:
        return {
            "email": self.email,
            "is_real_email": self.is_real_email,
            "is_valid_format": self.is_valid_format,
            "domain": self.domain,
            "is_disposable": self.is_disposable,
            "mx_valid": self.mx_valid,
            "smtp_valid": self.smtp_valid,
            "errors": self.errors,
        }


def is_valid_format(email: str) -> bool:
    """Check basic email format using regex."""
    if not email or '@' not in email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def get_domain(email: str) -> str:
    """Extract domain from email address."""
    _, addr = parseaddr(email)
    if '@' in addr:
        return addr.split('@')[-1].lower()
    return ""


def is_disposable_domain(domain: str) -> bool:
    """Check if domain appears to be a disposable email domain."""
    domain_lower = domain.lower()
    
    if domain_lower in SKIP_DOMAINS:
        return True
    
    for pattern in SKIP_PATTERNS:
        if pattern in domain_lower:
            return True
    
    common_disposable = [
        "tempmail", "throwaway", "mailinator", "guerrillamail", "10minutemail",
        "temp-mail", "fakeinbox", "trashmail", "getnada", "maildrop",
        "dispostable", "yopmail", "sharklasers", "guerrillamailblock",
    ]
    for d in common_disposable:
        if d in domain_lower:
            return True
    
    return False


def verify_mx_record(domain: str, timeout: int = 5) -> tuple[bool, Optional[str]]:
    """
    Check if domain has valid MX records.
    
    Returns:
        (is_valid, error_message)
    """
    if not domain:
        return False, "No domain provided"
    
    try:
        import dns.resolver
        try:
            mx_records = dns.resolver.resolve(domain, 'MX', lifetime=timeout)
            if len(mx_records) > 0:
                return True, None
        except dns.resolver.NXDOMAIN:
            return False, f"Domain {domain} does not exist"
        except dns.resolver.NoAnswer:
            pass
        
        try:
            a_record = dns.resolver.resolve(domain, 'A', lifetime=timeout)
            if len(a_record) > 0:
                return True, None
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
            return False, f"No MX or A records found for {domain}"
        
        return False, f"No DNS records found for {domain}"
        
    except ImportError:
        return True, None
    except Exception as e:
        return False, f"DNS lookup failed: {str(e)}"


def verify_smtp(email: str, timeout: int = 5) -> tuple[bool, Optional[str]]:
    """
    Verify mailbox exists via SMTP validation.
    
    Returns:
        (is_valid, error_message)
    """
    _, email_addr = parseaddr(email)
    if not email_addr or '@' not in email_addr:
        return False, "Invalid email format"
    
    domain = email_addr.split('@')[-1].lower()
    
    try:
        mx_hosts = []
        try:
            import dns.resolver
            try:
                mx_records = dns.resolver.resolve(domain, 'MX', lifetime=timeout)
                mx_hosts = [(str(r.preference), str(r.exchange).rstrip('.')) for r in mx_records]
                mx_hosts.sort()
            except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.exception.Timeout):
                mx_hosts = [(0, domain)]
        except ImportError:
            mx_hosts = [(0, domain)]
        
        for _, mx_host in mx_hosts[:3]:
            try:
                with smtplib.SMTP(mx_host, 25, timeout=timeout) as server:
                    server.helo('localhost')
                    server.mail('verify@example.com')
                    code, msg = server.rcpt(email_addr)
                    server.quit()
                    if code == 250:
                        return True, None
                    else:
                        return False, f"SMTP rejected: {code} {msg}"
            except socket.timeout:
                continue
            except smtplib.SMTPConnectError:
                continue
            except OSError:
                continue
            except Exception:
                continue
        
        return False, "Could not connect to mail server"
        
    except Exception as e:
        return False, f"SMTP validation failed: {str(e)}"


def validate_email(
    email: str,
    check_mx: bool = False,
    check_smtp: bool = False,
    check_disposable: bool = True,
) -> ValidationResult:
    """
    Validate an email address.
    
    Args:
        email: Email address to validate
        verify_mx: Check DNS MX records
        verify_smtp: Verify mailbox exists via SMTP
        check_disposable: Flag disposable/common domains
    
    Returns:
        ValidationResult with validation details
    """
    email = email.strip()
    errors = []
    
    is_valid_format_result = is_valid_format(email)
    domain = get_domain(email)
    is_disposable = check_disposable and is_disposable_domain(domain)
    
    result = ValidationResult(
        email=email,
        is_valid_format=is_valid_format_result,
        domain=domain,
        is_disposable=is_disposable,
    )
    
    if not is_valid_format_result:
        errors.append("Invalid email format")
        result.errors = errors
        return result
    
    if is_disposable:
        errors.append(f"Disposable domain: {domain}")
    
    if check_mx:
        mx_valid, mx_error = verify_mx_record(domain)
        result.mx_valid = mx_valid
        if not mx_valid:
            errors.append(mx_error or "MX validation failed")
    
    if check_smtp:
        smtp_ok, smtp_err = verify_smtp(email)
        result.smtp_valid = smtp_ok
        if not smtp_ok:
            errors.append(smtp_err or "SMTP validation failed")
    
    result.errors = errors
    return result


def is_real_email(
    email: str,
    check_mx: bool = False,
    check_smtp: bool = False,
) -> bool:
    """
    Simple boolean check if email is real/valid.
    
    Args:
        email: Email address to check
        check_mx: Check DNS MX records
        check_smtp: Verify mailbox exists via SMTP
    
    Returns:
        True if email appears to be a real business email
    """
    result = validate_email(email, check_mx=check_mx, check_smtp=check_smtp)
    return result.is_real_email


def print_result(result: ValidationResult, verbose: bool = False):
    """Print validation result to console."""
    status = "REAL" if result.is_real_email else "FAKE"
    symbol = "✓" if result.is_real_email else "✗"
    
    print(f"{symbol} {result.email}")
    print(f"  Status: {status}")
    
    if verbose or not result.is_real_email:
        print(f"  Format valid: {result.is_valid_format}")
        print(f"  Domain: {result.domain}")
        
        if result.is_disposable:
            print(f"  Disposable: YES")
        
        if result.mx_valid is not None:
            mx_status = "VALID" if result.mx_valid else "INVALID"
            print(f"  MX record: {mx_status}")
        
        if result.smtp_valid is not None:
            smtp_status = "VALID" if result.smtp_valid else "INVALID"
            print(f"  SMTP check: {smtp_status}")
        
        if result.errors:
            print(f"  Issues:")
            for error in result.errors:
                print(f"    - {error}")


def main():
    parser = argparse.ArgumentParser(
        description="Validate email addresses (MX and SMTP verification)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s test@example.com                    # Basic format check
  %(prog)s test@example.com --verify-mx         # Check MX records
  %(prog)s test@example.com --verify-smtp       # Verify mailbox exists
  %(prog)s test@example.com -m -s               # Both verifications
  %(prog)s - < emails.txt                       # Batch from file
  %(prog)s -m < leads.csv                       # Batch with MX check

Exit codes:
  0 - All emails are real
  1 - Some emails are invalid/fake
  2 - Error (invalid arguments)
        """
    )
    parser.add_argument("emails", nargs="*", help="Email addresses to validate")
    parser.add_argument("-m", "--verify-mx", action="store_true",
                        help="Verify DNS MX records exist")
    parser.add_argument("-s", "--verify-smtp", action="store_true",
                        help="Verify mailbox exists via SMTP (slower)")
    parser.add_argument("-v", "--verbose", action="store_true",
                        help="Show detailed output for all emails")
    parser.add_argument("-q", "--quiet", action="store_true",
                        help="Only show final summary")
    parser.add_argument("-j", "--json", action="store_true",
                        help="Output as JSON")
    
    args = parser.parse_args()
    
    emails_to_check = []
    
    if args.emails:
        if args.emails == ["-"]:
            lines = sys.stdin.read().splitlines()
            emails_to_check = [line.strip() for line in lines if line.strip()]
        else:
            emails_to_check = args.emails
    else:
        parser.print_help()
        sys.exit(2)
    
    if not emails_to_check:
        print("No emails provided", file=sys.stderr)
        sys.exit(2)
    
    results = []
    for email in emails_to_check:
        result = validate_email(
            email,
            check_mx=args.verify_mx,
            check_smtp=args.verify_smtp,
        )
        results.append(result)
        
        if not args.quiet:
            print_result(result, verbose=args.verbose)
        
        if args.verify_smtp:
            import time
            time.sleep(0.5)
    
    if args.json:
        import json
        output = [r.to_dict() for r in results]
        if len(output) == 1:
            output = output[0]
        print(json.dumps(output, indent=2))
    elif not args.quiet and len(results) > 1:
        real_count = sum(1 for r in results if r.is_real_email)
        print(f"\nSummary: {real_count}/{len(results)} emails appear real")
    
    sys.exit(0 if all(r.is_real_email for r in results) else 1)


if __name__ == "__main__":
    main()
