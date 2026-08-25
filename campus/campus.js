// MDO3D Campus — site plan (one room per product; SSOT for status: ../STATUS.md).
// This is the STRUCTURE (what rooms exist + where). Live numbers live in state.js.
// Loaded as a plain <script> (assigns a global) so the campus opens over file://
// with no server. Regenerate structure by editing here; regenerate state via collect_state.py.
//
// MDO3D is an umbrella studio: many small consumer web-apps grouped by product line.
// The HQ tower at center is the studio seat (mdo3d.com). Each quarter is a product line;
// each building a product. Height ~ kind + activity, glow ~ commit recency, crates ~ backlog.
//
// neighborhood = a product line / functional quarter of the studio campus.
// room.path    = repo dir the collector reads for per-dir activity + WIP (omit = conceptual).
// room.kind    = engine (shared platform reactor) | app | layer (api/infra) | command | tower.
// room.link    = live URL opened from the selection card (omit when the URL isn't confidently known).
// hqId         = the room rendered as the central HQ tower (pulled out of its quarter grid).

window.CAMPUS = {
  version: "v1",
  hqId: "mdo3d",
  neighborhoods: [
    { id: "core",       label: "Core — shared platform",                color: "#7c3aed", center: [-52, 0] },
    { id: "front",      label: "Front Door",                            color: "#f59e0b", center: [52, 0] },
    { id: "divination", label: "Divination — the mystic arcade",        color: "#a855f7", center: [0, -112] },
    { id: "growth",     label: "Growth — leads engine",                 color: "#84cc16", center: [0, 112] },
    { id: "utilities",  label: "mdothree — utility workshop",           color: "#22d3ee", center: [132, 0] },
    { id: "rigor",      label: "Rigor — career studio",                 color: "#f97316", center: [-132, 0] },
    { id: "ronna",      label: "Ronna Scanner — prospecting suite",     color: "#2dd4bf", center: [98, 98] },
    { id: "jarvisbee",  label: "Jarvisbee — naming lab",                color: "#38bdf8", center: [-98, -98] },
    { id: "external",   label: "External — client & label work",        color: "#ec4899", center: [-98, 98] },
    { id: "blacklab",   label: "Blacklab B — future-tech trackers",     color: "#a3a3a3", center: [98, -98] },
  ],
  rooms: [
    // --- HQ: the studio seat (rendered as the central tower) ---
    { id: "mdo3d", neighborhood: "front", kind: "tower", path: "projects/mdo3d/landing", link: "https://mdo3d.com", tagline: "mdo3d.com — the studio seat" },

    // --- Core: the shared platform every product rides on (the moat / reactor) ---
    { id: "platform", neighborhood: "core", kind: "engine", path: "projects/divination/shared", tagline: "shared Stripe · Firebase · AI services" },

    // --- Front Door ---
    { id: "guidance", neighborhood: "front", kind: "app", path: "projects/mdo3d/guidance", tagline: "guidance hub" },

    // --- Divination: 9 mystic services (each app + api) ---
    { id: "astrology",  neighborhood: "divination", kind: "app", path: "projects/divination/astrology",  link: "https://astrology.mdo3d.com",  tagline: "astrology readings" },
    { id: "tarot",      neighborhood: "divination", kind: "app", path: "projects/divination/tarot",      link: "https://tarot.mdo3d.com",      tagline: "tarot cards" },
    { id: "oracle",     neighborhood: "divination", kind: "app", path: "projects/divination/oracle",     link: "https://oracle.mdo3d.com",     tagline: "oracle cards" },
    { id: "dreams",     neighborhood: "divination", kind: "app", path: "projects/divination/dreams",     link: "https://dreams.mdo3d.com",     tagline: "dream interpreter" },
    { id: "numerology", neighborhood: "divination", kind: "app", path: "projects/divination/numerology", link: "https://numerology.mdo3d.com", tagline: "numerology app" },
    { id: "iching",     neighborhood: "divination", kind: "app", path: "projects/divination/iching",     link: "https://iching.mdo3d.com",     tagline: "I Ching" },
    { id: "runes",      neighborhood: "divination", kind: "app", path: "projects/divination/runes",      link: "https://runes.mdo3d.com",      tagline: "rune casting" },
    { id: "fengshui",   neighborhood: "divination", kind: "app", path: "projects/divination/fengshui",   link: "https://fengshui.mdo3d.com",   tagline: "feng shui analyzer" },
    { id: "pastlives",  neighborhood: "divination", kind: "app", path: "projects/divination/pastlives",  link: "https://pastlives.mdo3d.com",  tagline: "past-life insights" },

    // --- mdothree: utility micro-tools ---
    { id: "m3-api",       neighborhood: "utilities", kind: "layer", path: "projects/mdothree/mdothree-api",       tagline: "utilities API" },
    { id: "m3-color",     neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-color",     tagline: "color tools" },
    { id: "m3-hash",      neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-hash",      tagline: "hashing" },
    { id: "m3-image",     neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-image",     tagline: "image tools" },
    { id: "m3-json",      neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-json",      tagline: "JSON tools" },
    { id: "m3-password",  neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-password",  tagline: "password generator" },
    { id: "m3-pdf",       neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-pdf",       tagline: "PDF tools" },
    { id: "m3-qr",        neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-qr",        tagline: "QR codes" },
    { id: "m3-text",      neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-text",      tagline: "text tools" },
    { id: "m3-timestamp", neighborhood: "utilities", kind: "app",   path: "projects/mdothree/mdothree-timestamp", tagline: "timestamp tools" },

    // --- Rigor: job-hunt studio ---
    { id: "rigor-api",     neighborhood: "rigor", kind: "layer", path: "projects/rigor/api",        tagline: "rigor API" },
    { id: "rigor-landing", neighborhood: "rigor", kind: "app",   path: "projects/rigor/landing",    tagline: "rigor front page" },
    { id: "resume",        neighborhood: "rigor", kind: "app",   path: "projects/rigor/resume",     tagline: "resume builder" },
    { id: "cover",         neighborhood: "rigor", kind: "app",   path: "projects/rigor/cover",      tagline: "cover letters" },
    { id: "interview",     neighborhood: "rigor", kind: "app",   path: "projects/rigor/interview",  tagline: "interview prep" },
    { id: "linkedin",      neighborhood: "rigor", kind: "app",   path: "projects/rigor/linkedin",   tagline: "LinkedIn optimizer" },
    { id: "networking",    neighborhood: "rigor", kind: "app",   path: "projects/rigor/networking", tagline: "networking" },
    { id: "portfolio",     neighborhood: "rigor", kind: "app",   path: "projects/rigor/portfolio",  tagline: "portfolio builder" },
    { id: "salary",        neighborhood: "rigor", kind: "app",   path: "projects/rigor/salary",     tagline: "salary insights" },

    // --- Ronna Scanner: prospecting / CRM suite ---
    { id: "ronna-api",       neighborhood: "ronna", kind: "layer", path: "projects/ronnascanner/ronnascanner-api",       tagline: "scanner API" },
    { id: "ronna-web",       neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/frontend",               link: "https://ronnascanner.com", tagline: "ronnascanner.com — scanner frontend" },
    { id: "resume-analyzer", neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/resume-analyzer",        tagline: "resume analyzer" },
    { id: "companies",       neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/ronnascanner-companies", tagline: "company scanner" },
    { id: "contacts",        neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/ronnascanner-contacts",  tagline: "contact scanner" },
    { id: "emails",          neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/ronnascanner-emails",    tagline: "email finder" },
    { id: "ronna-leads",     neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/ronnascanner-leads",     tagline: "lead scanner" },
    { id: "prospects",       neighborhood: "ronna", kind: "app",   path: "projects/ronnascanner/ronnascanner-prospects", tagline: "prospect scanner" },

    // --- Jarvisbee: naming lab ---
    { id: "babynames",     neighborhood: "jarvisbee", kind: "app", path: "projects/jarvisbee/babynames",     tagline: "baby names" },
    { id: "businessnames", neighborhood: "jarvisbee", kind: "app", path: "projects/jarvisbee/businessnames", tagline: "business names" },
    { id: "jb-career",     neighborhood: "jarvisbee", kind: "app", path: "projects/jarvisbee/career",        tagline: "career naming" },

    // --- Growth: the leads engine ---
    { id: "leads", neighborhood: "growth", kind: "layer", path: "projects/leads", link: "https://leads.mdo3d.com", tagline: "leads.mdo3d.com — lead generation" },

    // --- External: client + label work ---
    { id: "dailyaitoll",    neighborhood: "external", kind: "app", path: "projects/external/dailyaitoll",    tagline: "Daily AI Toll — collector + rollups" },
    { id: "runwae",         neighborhood: "external", kind: "app", path: "projects/external/runwae",         tagline: "runwae" },
    { id: "runwae-apparel", neighborhood: "external", kind: "app", path: "projects/external/runwae-apparel", tagline: "runwae apparel" },

    // --- Blacklab B: future-technology trackers (blacklabb.com) ---
    { id: "bl-landing", neighborhood: "blacklab", kind: "command", path: "projects/blacklab/landing",                    link: "https://blacklabb.com",         tagline: "blacklabb.com — division front door" },
    { id: "quantum",    neighborhood: "blacklab", kind: "app",     path: "projects/blacklab/research/blacklab-quantum",  link: "https://quantum.blacklabb.com", tagline: "quantum.blacklabb.com — quantum computing / comms / sensing" },
    { id: "space",      neighborhood: "blacklab", kind: "app",     path: "projects/blacklab/research/blacklab-space",    link: "https://space.blacklabb.com",   tagline: "space.blacklabb.com — space exploration / launches / missions" },
    { id: "neuro",      neighborhood: "blacklab", kind: "app",     path: "projects/blacklab/research/blacklab-neuro",    link: "https://neuro.blacklabb.com",   tagline: "neuro.blacklabb.com — brain-computer interfaces / neurotech" },
  ],
};
