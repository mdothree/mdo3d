"""State adapters (DRAFT). See adapters/base.py and docs/STATE_ADAPTERS.md."""
from .base import Address, Contact, Filing, RawBatch, StateAdapter, run_adapter  # noqa: F401
from .fl import FloridaAdapter  # noqa: F401

ADAPTERS = {"FL": FloridaAdapter}
