# Iran canvas artwork

`iran_canvas_18x24_300dpi.png` — 5400 × 7200 px, 18 × 24 in @ 300 DPI.

3:4 aspect, so the same file also covers 12×16 and 24×32 without resampling.

## Content

Country outline plus the name in Persian (ایران) and Latin (IRAN), with a
coordinates caption. No state emblem, no flag, and no religious script or
iconography of any kind.

## How it was made

Regenerate with `python3 render.py` (needs `pillow`, `uharfbuzz`, `fonttools`).

- **`iran_hi.json`** — boundary geometry from
  [geoBoundaries](https://www.geoboundaries.org/) (gbOpen, ADM0, release
  `9469f09`), 2,414 points across the mainland and 11 Gulf islands. Committed
  so the artwork is reproducible without a network call.
- **`geo.py`** — projects lon/lat to 2D with **Albers Equal Area Conic**
  (standard parallels 29°N / 38°N). An unprojected plot stretches Iran
  east–west at these latitudes and looks visibly wrong to anyone who knows
  the shape.
- **`textpath.py`** — shapes Persian with HarfBuzz and converts the result to
  outlines. Pillow here has no libraqm, so it cannot shape Arabic-script text
  on its own — it would render isolated letters in visual order. Going
  through outlines also means the artwork has no font dependency.
- **`render.py`** — composition and rasterisation. There is no libcairo on
  this machine, so antialiasing is done by supersampling each layer's
  bounding box ×3 and downsampling with Lanczos.

## Print setup

Sized for **Matte Canvas, Stretched, 1.25″**. The outer 1.25 in (375 px)
wraps around the frame edge and is not visible from the front; all type and
the inner rule sit well inside that. The background bleeds to the edge so the
wrap reads as a continuation of the piece.

## Uploading to Printify

`uploadPrintifyImage()` in `src/lib/printify.ts` posts this file to the
Printify media library. It needs `PRINTIFY_API_TOKEN` set. Once uploaded,
place it on the canvas blueprint in Printify, then link the resulting product
from `/admin/products/printify`.
