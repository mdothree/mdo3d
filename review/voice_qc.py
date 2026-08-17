"""Voice QC gate — scan a social post against comms/voice/VOICE_AND_GUIDELINES.md.

Pure functions, no deps. Each check returns zero or more flags. A flag is
{code, severity, message}. severity is "block" (a hard forbidden-list hit) or
"review" (a heuristic worth a human glance). The dashboard shows these inline so
the operator sees violations before approving.

Rules mirror the forbidden list in the voice doc:
  em/en dashes · "not X, it is Y" contrastive reframing · our-product performance
  claims · adoption metrics · product/brand and compound/camelCase hashtags.

Brand-specific claims rules (per-product do-NOT-claim lists) get added here once
MDO3D social content and its voice guide are defined; see comms/voice/.
"""
from __future__ import annotations

import re

_HASHTAG = re.compile(r"#([A-Za-z0-9_]+)")
_BRAND_TAGS = {"mdo3d", "mdothree", "rigor", "ronnascanner", "runwae",
               "jarvisbee", "blacklab", "divination", "dailyaitoll"}
_PRODUCT_WORDS = r"(?:our|we)"


def _flag(code, severity, message):
    return {"code": code, "severity": severity, "message": message}


def hashtags(text: str) -> list[str]:
    return _HASHTAG.findall(text or "")


def scan(body: str, extra: str = "") -> list[dict]:
    text = f"{body}\n{extra}"
    flags: list[dict] = []

    # 1. em / en dashes anywhere in the body
    if "—" in text or "–" in text:
        flags.append(_flag("em_dash", "block", "Em or en dash in the body — use separate sentences."))

    # 2. contrastive reframing: "not just", "not X, it is Y", "not A, but B",
    #    and the dash form "It is not a growth mechanism, it is a trust boundary".
    if re.search(r"\bnot just\b", text, re.I) or re.search(r"\bisn'?t just\b", text, re.I) or \
       re.search(r"\b(?:is|are|was|were|it'?s|they'?re|that'?s)\s+not\b[^.\n]{0,50}[,;—–-]\s*(?:it'?s|it is|they'?re|that'?s|but|rather)\b", text, re.I) or \
       re.search(r"\bnot\b[^.\n]{0,40},\s*(it'?s|it is|they'?re|that'?s|but|rather)\b", text, re.I):
        flags.append(_flag("negation", "review",
                           'Contrastive reframing ("not X, it is Y") — state directly what it is.'))

    # 3. performance/improvement claims about our own product (heuristic)
    if re.search(_PRODUCT_WORDS + r"\b[^.\n]{0,40}\b(\d+\s*[x×%]|\d+\s*percent|faster|slower|higher|lower|better|cheaper|reduces?|cuts?|improv)", text, re.I):
        flags.append(_flag("perf_claim", "review", "Possible performance claim about our own product — cite a study or drop it."))

    # 4. adoption / user-count metrics
    if re.search(r"\btrusted by\b", text, re.I) or \
       re.search(r"\b\d[\d,]*\+?\s*(users|customers|clients|companies|teams|installs)\b", text, re.I):
        flags.append(_flag("adoption", "review", "Adoption / user-count metric — not allowed for our product."))

    # 5. hashtags: no product/brand names, no compound/camelCase
    tags = hashtags(text)
    for t in tags:
        low = t.lower()
        if low in _BRAND_TAGS:
            flags.append(_flag("brand_hashtag", "block", f"#{t} is a product/brand hashtag — use broad topic tags."))
        elif re.search(r"[a-z][A-Z]", t) or re.search(r"[A-Z]{2,}[a-z]", t):
            flags.append(_flag("compound_hashtag", "block", f"#{t} is compound/camelCase — use single searchable words or field acronyms."))
    if len(tags) > 5:
        flags.append(_flag("hashtag_count", "review", f"{len(tags)} hashtags — keep to four or five broad tags."))

    return flags


def worst(flags: list[dict]) -> str:
    if any(f["severity"] == "block" for f in flags):
        return "block"
    if flags:
        return "review"
    return "clean"
