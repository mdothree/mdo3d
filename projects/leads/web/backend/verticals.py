"""
Keyword verticals for filing search.

A vertical is a named keyword list matched against the registered entity NAME only (case-insensitive
substring). It is a name match, not an industry classification: the UI should say "name contains"
rather than claiming the business is in that industry. Lists for tech / workforce / defense_rd come
from the original FL profiles (config/profiles.json).
"""

VERTICALS: dict[str, dict] = {
    "tech": {
        "label": "Technology & software",
        "keywords": [
            "technolog", "tech ", "software", "cloud", "cyber", "data", "analytics", " ai ", " ai,",
            "machine learning", "digital", "devops", "saas", "platform", "automation", "robotic",
            "iot", "network", "it services", "it solutions", "web ", "app ", "systems",
        ],
    },
    "workforce_education": {
        "label": "Workforce & education",
        "keywords": [
            "workforce", "job training", "employment", "career", "educat", "school", "academy",
            "skills", "apprentice", "vocational", "tutor", "learning center",
        ],
    },
    "defense_rd": {
        "label": "Defense, aerospace & R&D",
        "keywords": [
            "research", "r&d", "defense", "defence", "aerospace", "aviation", "simulation",
            "laboratory", " labs", "scientific", "engineering", "government contract", "tactical",
        ],
    },
    "construction_trades": {
        "label": "Construction & trades",
        "keywords": [
            "construction", "builders", "building", "roofing", "plumbing", "electric", "hvac",
            "remodel", "contracting", "contractor", "concrete", "landscap", "painting", "renovation",
        ],
    },
    "health_wellness": {
        "label": "Health & wellness",
        "keywords": [
            "health", "medical", "clinic", "dental", "therapy", "wellness", "care ", "pharma",
            "chiropractic", "nursing", "fitness", "med spa",
        ],
    },
    "real_estate": {
        "label": "Real estate & property",
        "keywords": ["real estate", "realty", "properties", "property", "homes", "rentals", "holdings"],
    },
    "food_hospitality": {
        "label": "Food & hospitality",
        "keywords": [
            "restaurant", "cafe", "coffee", "kitchen", "catering", "bakery", "grill", "food",
            "bar ", "brewing", "hospitality",
        ],
    },
    "logistics": {
        "label": "Transport & logistics",
        "keywords": ["logistics", "trucking", "transport", "freight", "delivery", "courier", "moving", "hauling"],
    },
    "nonprofit": {
        "label": "Nonprofits (by entity type)",
        "keywords": [],  # matched by entity_kind == "nonprofit", not by name
        "entity_kind": "nonprofit",
    },
}


def resolve(vertical: str | None) -> tuple[list[str], str | None]:
    """(keywords, entity_kind override) for a vertical id; raises KeyError for unknown ids."""
    if not vertical:
        return [], None
    v = VERTICALS[vertical]
    return list(v.get("keywords") or []), v.get("entity_kind")
