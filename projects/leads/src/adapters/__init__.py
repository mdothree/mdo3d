"""State adapters. See adapters/base.py and docs/STATE_ADAPTERS.md."""
from .base import (  # noqa: F401
    ENTITY_KINDS, Address, Contact, Filing, RawBatch, StateAdapter, dedupe, run_adapter,
)
from .co import ColoradoAdapter  # noqa: F401
from .fl import FL_TYPE_KIND, FloridaAdapter  # noqa: F401

# Implemented adapters. Only free, no-registration sources are implemented; registration-required
# and paid state feeds are a spend/registration decision (docs/OTHER_STATES.md).
ADAPTERS = {"FL": FloridaAdapter, "CO": ColoradoAdapter}


def get_adapter(state: str):
    code = (state or "").strip().upper()
    if code not in ADAPTERS:
        raise KeyError(f"No adapter for state {state!r}; implemented: {sorted(ADAPTERS)}")
    return ADAPTERS[code]()
