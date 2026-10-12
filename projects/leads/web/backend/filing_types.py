"""
Per-state filing-type reference data for GET /filing-types (codes, labels, entity kinds).

The API image is built from web/backend only, so it cannot import src/adapters. These tables mirror the
adapters' code maps (src/adapters/fl.py FL_TYPE_KIND, src/adapters/co.py CO_TYPE_KIND);
tests/test_account_api.py fails if they drift. States without a table here (e.g. CT) are served from the
distinct filing_type values stored in the filings table, labelled with the code itself.
"""

# code -> (label, entity_kind)
FILING_TYPES: dict[str, dict[str, tuple[str, str]]] = {
    "FL": {
        "FLAL": ("Florida LLC", "llc"),
        "FORL": ("Foreign LLC", "llc"),
        "DOMP": ("Domestic profit corporation", "corporation"),
        "FORP": ("Foreign profit corporation", "corporation"),
        "DOMNP": ("Domestic non-profit corporation", "nonprofit"),
        "FORNP": ("Foreign non-profit corporation", "nonprofit"),
        "NPREG": ("Non-profit registration", "nonprofit"),
        "DOMLP": ("Domestic limited partnership", "partnership"),
        "FORLP": ("Foreign limited partnership", "partnership"),
        "LLP": ("Limited liability partnership", "partnership"),
        "FORLLP": ("Foreign limited liability partnership", "partnership"),
        "GENPAR": ("General partnership", "partnership"),
        "FIC": ("Fictitious name (trade name)", "trade_name"),
    },
    "CO": {
        "DLLC": ("Domestic limited liability company", "llc"),
        "FLLC": ("Foreign limited liability company", "llc"),
        "DPC": ("Domestic profit corporation", "corporation"),
        "FPC": ("Foreign profit corporation", "corporation"),
        "DPC-PBC": ("Domestic public benefit corporation", "corporation"),
        "DNC": ("Domestic nonprofit corporation", "nonprofit"),
        "FNC": ("Foreign nonprofit corporation", "nonprofit"),
        "DLP": ("Domestic limited partnership", "partnership"),
        "FLP": ("Foreign limited partnership", "partnership"),
        "DLLP": ("Domestic limited liability partnership", "partnership"),
        "FLLP": ("Foreign limited liability partnership", "partnership"),
        "DLLLP": ("Domestic limited liability limited partnership", "partnership"),
        "FLLLP": ("Foreign limited liability limited partnership", "partnership"),
        "GP": ("General partnership", "partnership"),
        "DLPA": ("Domestic limited partnership association", "partnership"),
        "FLPA": ("Foreign limited partnership association", "partnership"),
        "DC55": ("Cooperative (Article 55)", "cooperative"),
        "DC55-PBC": ("Cooperative (Article 55), public benefit", "cooperative"),
        "DC56": ("Cooperative (Article 56)", "cooperative"),
        "DC56-PBC": ("Cooperative (Article 56), public benefit", "cooperative"),
        "DLCA": ("Limited cooperative association", "cooperative"),
        "DLCA-PBC": ("Limited cooperative association, public benefit", "cooperative"),
        "FLCA": ("Foreign limited cooperative association", "cooperative"),
        "FCOOP": ("Foreign cooperative", "cooperative"),
    },
}


def for_state(state: str, stored: list[dict]) -> list[dict]:
    """Merge the static table with the codes actually stored for the state.

    `stored` is db.filing_type_counts(state): [{filing_type, entity_kind, filings}].
    Static codes come first in table order; stored-only codes follow, sorted, labelled by code.
    """
    table = FILING_TYPES.get(state.upper(), {})
    counts = {r["filing_type"].upper(): r for r in stored if r.get("filing_type")}
    out = []
    for code, (label, kind) in table.items():
        out.append({"code": code, "label": label, "entity_kind": kind,
                    "filings": int(counts.get(code, {}).get("filings") or 0)})
    for code in sorted(set(counts) - set(table)):
        r = counts[code]
        out.append({"code": code, "label": code, "entity_kind": r.get("entity_kind") or "other",
                    "filings": int(r.get("filings") or 0)})
    return out
