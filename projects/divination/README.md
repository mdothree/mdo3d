# Divination - Spiritual & Mystical Tools

**MDO3D Divination** - Spiritual and mystical tools for self-discovery and guidance.

## Mission

Provide accessible divination tools for spiritual growth, self-reflection, and mystical exploration.

## Platforms

| Tool | Subdomain | Description |
|------|-----------|-------------|
| Oracle Cards | `oracle.mdo3d.com` | Mystical oracle card readings |
| Tarot Cards | `tarot.mdo3d.com` | Traditional tarot card readings |
| Dream Interpreter | `dreams.mdo3d.com` | AI-powered dream analysis |
| Astrology | `astrology.mdo3d.com` | Birth chart readings and horoscopes |
| Feng Shui | `fengshui.mdo3d.com` | Space harmony and energy analysis |
| I Ching | `iching.mdo3d.com` | Ancient Chinese divination |
| Runes | `runes.mdo3d.com` | Norse runic divination |
| Past Life | `pastlife.mdo3d.com` | Past life regression exploration |

## Tech Stack

- Vanilla JS with Firebase
- Firebase Auth for user accounts
- Cloud Firestore for data persistence
- Cloud Storage for media assets
- Firebase Hosting for deployment

## Structure

```
divination/
├── oracle/          # Oracle card readings
├── tarot/           # Tarot card readings
├── dreams/          # Dream interpreter
├── astrology/       # Astrology readings
├── fengshui/       # Feng Shui analysis
├── iching/          # I Ching divination
├── runes/           # Rune divination
├── pastlives/       # Past life regression
└── README.md
```

## Firebase Projects

Each tool has its own Firebase project for isolation:

| Tool | Project ID | Services |
|------|-----------|----------|
| oracle | `oracle-mdo3d` | Auth, Firestore, Storage |
| tarot | `tarot-mdo3d` | Auth, Firestore, Storage |
| dreams | `dreams-mdo3d` | Auth, Firestore, Storage |
| astrology | `astrology-mdo3d` | Auth, Firestore |
| fengshui | `fengshui-mdo3d` | Auth, Firestore |
| iching | `iching-mdo3d` | Auth, Firestore |
| runes | `runes-mdo3d` | Auth, Firestore |
| pastlives | `pastlife-mdo3d` | Auth, Firestore |

## Deployment

Each tool is deployed to its own Firebase Hosting site:

```bash
cd divination/tarot
firebase deploy --project tarot-mdo3d
```

## Brand

- **Parent**: MDO3D (Spiritual & Transformational Tech)
- **Focus**: Spiritual growth and mystical exploration
- **Tagline**: "Discover Your Path"
