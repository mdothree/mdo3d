# MDO3D Campus — 3D HQ

A navigable 3D **headquarters** for the MDO3D studio: a central **HQ tower** (the seat —
mdo3d.com, with a glowing reactor ring for the shared platform underneath it), surrounded
by **product-line quarters** (Divination, mdothree utilities, Rigor, Ronna Scanner,
Jarvisbee, Growth, External, Blacklab B). Connector beams run from HQ to each quarter.
Every building is a live product; **click one to open its real site**.

Modeled on the Ridgefield campus HQ (`~/ridgefield/campus/`), driven by MDO3D's own
`campus.js` + live `state.js` so it stays honest and refreshable.

## Open it

```
open campus/index.html        # macOS — opens in your default browser
```

No build, no server, no `node_modules`. Three.js loads from a CDN (needs internet); the
campus + state data load as plain `<script>` globals so it works straight off `file://`.

**Navigate:** drag = orbit · scroll = zoom · right-drag = pan · click a building = detail
card (with an **Open →** link where the live URL is known) · click a quarter in the legend
to fly there · toolbar (bottom) = auto-rotate / reset view / scene settings.

**Scene settings drawer** (⚙, custom UI, persists to `localStorage`): backlog crates + grid
toggles, window glow, lighting (ambient / key / fill, sun azimuth + elevation), shadows +
quality, camera FOV + perspective↔orthographic + zoom limits + view presets, render style
(solid / wire / transparent), background color, and reset-to-defaults.

## What you're looking at

| Visual channel | Encodes | Source |
|---|---|---|
| **HQ tower** (center) | the studio seat — mdo3d.com | `campus.js` `hqId` |
| **Reactor ring** under HQ + violet core | the shared Stripe/Firebase/AI platform (the moat) | `platform` room |
| Building **glow / lit windows** | commit recency for that product's dir | `git log` scoped per-dir |
| Building **height** | kind (app/api/landing) + a small activity bump | `campus.js` + `state.js` |
| **Cap color** | status — green `up` (active) · amber `wip` · gray `idle` | derived from activity + WIP |
| **Red crates** | mentions of the product in STATUS + audit docs (known-issue proxy) | `documentation/*.md` |
| **Amber crates** | uncommitted working-tree WIP under that dir | `git status -- <dir>` |
| **Connector beams** | HQ ↔ each product line | — |
| Quarters | Divination · mdothree · Rigor · Ronna · Jarvisbee · Growth · External · Blacklab · Core · Front | `campus.js` |

## Two files, one job each

- **`campus.js`** — the **site plan**: `hqId`, neighborhoods (product lines + colors + centers),
  and rooms (id, kind, repo path, tagline, and a live `link` where known). Edit here to add/move
  a room or wire a URL. Structure; changes rarely.
- **`state.js`** — the **live numbers**, generated. Never hand-edit.

## Refresh the live state

```
python3 campus/collect_state.py      # stdlib only; re-reads git + docs, rewrites state.js
```

Reload the page after running it. Wire this into a `loops/` maintenance loop to keep the
board current unattended.

## Per-directory activity

MDO3D is a monorepo: the 9 divination services share one `.git`, so a repo-wide `git log`
would light them all identically. This collector resolves each room's **enclosing repo**
(`rev-parse --show-toplevel`) and scopes `git log`/`git status` to the room's **subpath** —
so each service reports its own real activity and WIP. Nested repos (`mdothree/*`, `rigor/*`,
`ronnascanner/*`) resolve to their own top-level and behave the same.

## Notes / next

- **`link`s are attached only where the live URL is confidently known** (mdo3d.com; the 9
  `*.mdo3d.com` divination services; `leads.mdo3d.com`; `blacklabb.com` + the three
  `*.blacklabb.com` trackers; `ronnascanner.com`). Buildings without a wired URL show details
  but no Open button — add the URL to that room's `link` in `campus.js` when it's confirmed.
- **Status is derived** from git signals (activity ≥ 30% ⇒ `up`, else WIP ⇒ `wip`, else `idle`),
  not from live reachability. A real up/down check per subdomain is the next upgrade.
- Buildings are textured primitives. Swapping in per-product GLTF models is later polish; the
  data model (`campus.js` + `state.js`) is unchanged by that upgrade.
