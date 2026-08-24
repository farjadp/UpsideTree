"""Upside Tree — 'ایران' canvas artwork.

Output: 5400x7200 px = 18x24in @ 300dpi, 3:4 so the same file also covers
12x16 and 24x32.

Content is deliberately limited to the country outline and its name in
Persian and Latin: no state emblem, no flag, no religious script or
iconography of any kind.
"""
import math
from PIL import Image, ImageDraw, ImageFilter

import geo
import textpath

# --- canvas ---------------------------------------------------------------
W, H = 5400, 7200
SS = 3  # supersample factor for antialiasing

# Printify stretches this over a 1.25" bar, so roughly the outer 1.25in
# (375px) wraps around the frame edge and is not seen from the front.
WRAP = 375
SAFE = WRAP + 260

# --- palette (Upside Tree brand) ------------------------------------------
INK = (18, 26, 23)
INK_LIFT = (28, 40, 35)
GOLD = (180, 134, 53)
GOLD_LIGHT = (214, 175, 96)
IVORY = (244, 239, 227)
LAPIS = (29, 78, 137)

FONT_AR = "/System/Library/Fonts/GeezaPro.ttc"


def render_mask(polys, holes_list=None, ss=SS):
    """Antialiased mask for polygons, supersampled only inside their bbox."""
    xs = [p[0] for poly in polys for p in poly]
    ys = [p[1] for poly in polys for p in poly]
    if not xs:
        return None, (0, 0)

    pad = 4
    minx = max(0, int(min(xs)) - pad)
    miny = max(0, int(min(ys)) - pad)
    maxx = min(W, int(max(xs)) + pad)
    maxy = min(H, int(max(ys)) + pad)
    bw, bh = maxx - minx, maxy - miny
    if bw <= 0 or bh <= 0:
        return None, (0, 0)

    big = Image.new("L", (bw * ss, bh * ss), 0)
    d = ImageDraw.Draw(big)
    for poly in polys:
        if len(poly) >= 3:
            d.polygon([((x - minx) * ss, (y - miny) * ss) for x, y in poly], fill=255)
    for hole in (holes_list or []):
        if len(hole) >= 3:
            d.polygon([((x - minx) * ss, (y - miny) * ss) for x, y in hole], fill=0)

    small = big.resize((bw, bh), Image.LANCZOS)
    big.close()
    return small, (minx, miny)


def paste_mask(target_mask, mask, origin):
    if mask is None:
        return
    existing = target_mask.crop((origin[0], origin[1], origin[0] + mask.width, origin[1] + mask.height))
    from PIL import ImageChops
    target_mask.paste(ImageChops.lighter(existing, mask), origin)


def vertical_gradient(size, top, bottom):
    w, h = size
    grad = Image.new("RGB", (1, h))
    px = grad.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = (
            round(top[0] + (bottom[0] - top[0]) * t),
            round(top[1] + (bottom[1] - top[1]) * t),
            round(top[2] + (bottom[2] - top[2]) * t),
        )
    return grad.resize(size, Image.BILINEAR)


def build_background():
    base = vertical_gradient((W, H), INK_LIFT, INK)
    # Soft warm glow behind the map so the gold silhouette sits in light
    # rather than floating on flat black.
    glow = Image.new("L", (W, H), 0)
    gd = ImageDraw.Draw(glow)
    cx, cy = W // 2, int(H * 0.40)
    r = int(W * 0.62)
    for i in range(60):
        t = i / 59
        rr = int(r * (1 - t * 0.92))
        gd.ellipse([cx - rr, cy - rr * 0.9, cx + rr, cy + rr * 0.9], fill=int(46 * t))
    glow = glow.filter(ImageFilter.GaussianBlur(W // 24))
    warm = Image.new("RGB", (W, H), (58, 48, 30))
    return Image.composite(Image.blend(base, warm, 0.55), base, glow)


def graticule_lines(polys_fitted, scale_info):
    """Lat/long lines clipped to the country — cartographic texture."""
    (minx, miny, maxx, maxy), fit_scale, dx, dy = scale_info
    segs = []

    def to_canvas(lon, lat):
        x, y = geo.project(lon, lat)
        return ((x - minx) * fit_scale + dx, (y - miny) * fit_scale + dy)

    for lat in range(24, 41, 2):
        pts = [to_canvas(lon / 10.0, lat) for lon in range(430, 641, 4)]
        segs.append(pts)
    for lon in range(44, 64, 2):
        pts = [to_canvas(lon, lat / 10.0) for lat in range(240, 401, 4)]
        segs.append(pts)
    return segs


def main():
    img = build_background()

    # ---- map ------------------------------------------------------------
    polys = geo.load_rings("iran_hi.json")
    map_box_w = W - SAFE * 2
    map_box_h = int(H * 0.50)
    map_top = int(H * 0.115)

    minx, miny, maxx, maxy = geo.bounds(polys)
    gw, gh = maxx - minx, maxy - miny
    fit_scale = min(map_box_w / gw, map_box_h / gh)
    draw_w, draw_h = gw * fit_scale, gh * fit_scale
    dx = SAFE + (map_box_w - draw_w) / 2.0
    dy = map_top + (map_box_h - draw_h) / 2.0

    def tx(p):
        return ((p[0] - minx) * fit_scale + dx, (p[1] - miny) * fit_scale + dy)

    fitted = [([tx(p) for p in ext], [[tx(p) for p in hl] for hl in holes]) for ext, holes in polys]
    exteriors = [ext for ext, _ in fitted]
    holes = [h for _, hs in fitted for h in hs]

    map_mask, origin = render_mask(exteriors, holes)
    full_map_mask = Image.new("L", (W, H), 0)
    paste_mask(full_map_mask, map_mask, origin)

    # Gold gradient across the landmass.
    gold_fill = vertical_gradient((W, H), GOLD_LIGHT, GOLD)
    img = Image.composite(gold_fill, img, full_map_mask)

    # Graticule etched into the map only.
    grat = Image.new("L", (W, H), 0)
    gdraw = ImageDraw.Draw(grat)
    for seg in graticule_lines(fitted, ((minx, miny, maxx, maxy), fit_scale, dx, dy)):
        gdraw.line(seg, fill=255, width=5)
    grat = Image.composite(grat, Image.new("L", (W, H), 0), full_map_mask)
    shade = Image.new("RGB", (W, H), (120, 88, 30))
    img = Image.composite(Image.blend(img, shade, 0.55), img, grat)

    # NOTE: every Image.composite() below rebinds `img` to a NEW image, so
    # an ImageDraw handle taken here would silently paint onto an orphaned
    # copy. All direct drawing happens at the end, after the last composite.

    # ---- typography ------------------------------------------------------
    text_top = map_top + map_box_h + int(H * 0.055)

    fa_contours, _ = textpath.shape_to_contours(FONT_AR, "ایران", 760, font_number=0)
    fminx, fminy, fmaxx, fmaxy = textpath.contour_bounds(fa_contours)
    fa_contours = textpath.translate(fa_contours, (W - (fmaxx - fminx)) / 2 - fminx, text_top - fminy)
    fa_mask, fa_origin = render_mask(fa_contours)
    fa_full = Image.new("L", (W, H), 0)
    paste_mask(fa_full, fa_mask, fa_origin)
    img = Image.composite(Image.new("RGB", (W, H), IVORY), img, fa_full)

    fa_bottom = text_top + (fmaxy - fminy)

    def letterspaced(text, size, tracking, y_top, color, font=None):
        """Draw centered, letterspaced Latin text from outlines. Returns bottom y."""
        font = font or "/System/Library/Fonts/NewYork.ttf"
        contours = []
        penx = 0.0
        for ch in text:
            if ch == " ":
                penx += size * 0.42 + tracking
                continue
            cs, adv = textpath.shape_to_contours(
                font, ch, size, direction="ltr", script="latn", language="en"
            )
            contours.extend(textpath.translate(cs, penx, 0))
            penx += adv + tracking
        if not contours:
            return y_top
        bminx, bminy, bmaxx, bmaxy = textpath.contour_bounds(contours)
        contours = textpath.translate(contours, (W - (bmaxx - bminx)) / 2 - bminx, y_top - bminy)
        m, o = render_mask(contours)
        full = Image.new("L", (W, H), 0)
        paste_mask(full, m, o)
        return Image.composite(Image.new("RGB", (W, H), color), img, full), y_top + (bmaxy - bminy)

    rule_y = int(fa_bottom + H * 0.030)

    img, latin_bottom = letterspaced("IRAN", 210, 150, rule_y + int(H * 0.030), GOLD_LIGHT)

    # Coordinates caption — cartographic detail that also settles the
    # bottom of the composition.
    img, _ = letterspaced("32°N   53°E", 92, 46, latin_bottom + int(H * 0.028), (150, 132, 100))

    # ---- direct drawing (must come after the final composite) ------------
    draw = ImageDraw.Draw(img)

    rule_w = int(W * 0.16)
    draw.rectangle([W // 2 - rule_w // 2, rule_y, W // 2 + rule_w // 2, rule_y + 7], fill=GOLD)

    inset = SAFE - 90
    draw.rectangle([inset, inset, W - inset, H - inset], outline=(86, 70, 38), width=6)

    img.save("iran_canvas_18x24_300dpi.png", dpi=(300, 300))
    print("saved iran_canvas_18x24_300dpi.png", img.size)

    img.resize((W // 6, H // 6), Image.LANCZOS).save("preview_canvas.png")
    print("saved preview_canvas.png")


if __name__ == "__main__":
    main()
