# Baby Name Oracle report data (names.mdo3d.com)

Used by `src/routes/namesReport.js` (`POST /api/names/report`, `POST /api/names/report-by-email`).

## `ssa_top1000_2025.json`

- **Source:** US Social Security Administration, national baby-name data
  (`names.zip`, https://www.ssa.gov/oact/babynames/limits.html). US government work, public domain.
- **Downloaded:** 2026-10-13 (archive dated 2026-04-10, sha256
  `cd78e975ed7bb358e018dd62fbe14ced89295e9581c49172ca4eedcb011b3724`). The latest year in the archive is **2025**.
- **Contents:** the top 1000 names per sex for 2025, as `[name, births, prevRank|null]`. Rank = index + 1,
  in SSA file order (births descending, then name A to Z), which is how SSA ranks its lists. `prevRank` is
  the name's rank in the full 2024 file (any rank, not only the top 1000), or `null` if it was absent in 2024.
- **Rebuild:** download and unzip `names.zip` (ssa.gov blocks curl; a real browser works), then
  `node scripts/build-ssa-names.mjs <unzipped-dir> [year]`. When SSA publishes a new year, rebuild, then update
  the import in `report.js`.

## `curated.js`

The 20 hand-curated names (meaning and origin) shown on the site. No other name gets a stated meaning or origin.
The report says "not in our curated set" instead of inventing one.

## Numerology

Pythagorean letter values (A=1 ... I=9, J=1 ...), reduced to a single digit and keeping the master numbers
11, 22 and 33. Vowels are A, E, I, O and U; Y counts as a consonant. It is real arithmetic on the letters,
presented as entertainment.
