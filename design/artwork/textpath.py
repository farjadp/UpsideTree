"""Shape text with HarfBuzz and return filled polygons.

Pillow on this machine has no libraqm, so it cannot shape Arabic-script
text — Persian would come out as isolated letters in visual-LTR order.
Shaping here and emitting outlines sidesteps that entirely, and also means
the artwork carries no font dependency downstream.
"""
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import RecordingPen


def _flatten_quad(p0, p1, p2, steps=12):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        x = mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0]
        y = mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1]
        pts.append((x, y))
    return pts


def _flatten_cubic(p0, p1, p2, p3, steps=16):
    pts = []
    for i in range(1, steps + 1):
        t = i / steps
        mt = 1 - t
        x = (mt**3) * p0[0] + 3 * (mt**2) * t * p1[0] + 3 * mt * (t**2) * p2[0] + (t**3) * p3[0]
        y = (mt**3) * p0[1] + 3 * (mt**2) * t * p1[1] + 3 * mt * (t**2) * p2[1] + (t**3) * p3[1]
        pts.append((x, y))
    return pts


def _pen_to_contours(pen):
    """RecordingPen commands -> list of point lists (already flattened)."""
    contours = []
    current = []
    start = None
    cur = None

    for op, args in pen.value:
        if op == "moveTo":
            if len(current) >= 3:
                contours.append(current)
            cur = args[0]
            start = cur
            current = [cur]
        elif op == "lineTo":
            cur = args[0]
            current.append(cur)
        elif op == "qCurveTo":
            # TrueType quadratic, possibly with implied on-curve midpoints.
            pts = list(args)
            if pts[-1] is None:
                # All off-curve: implied final on-curve point.
                pts = pts[:-1]
                if len(pts) >= 2:
                    implied = ((pts[0][0] + pts[-1][0]) / 2, (pts[0][1] + pts[-1][1]) / 2)
                    pts = pts + [implied]
            ctrls = pts[:-1]
            end = pts[-1]
            for i, c in enumerate(ctrls):
                if i < len(ctrls) - 1:
                    nxt = ctrls[i + 1]
                    mid = ((c[0] + nxt[0]) / 2, (c[1] + nxt[1]) / 2)
                else:
                    mid = end
                current.extend(_flatten_quad(cur, c, mid))
                cur = mid
        elif op == "curveTo":
            c1, c2, end = args
            current.extend(_flatten_cubic(cur, c1, c2, end))
            cur = end
        elif op == "closePath":
            if len(current) >= 3:
                contours.append(current)
            current = []
            cur = start

    if len(current) >= 3:
        contours.append(current)
    return contours


def shape_to_contours(font_path, text, size_px, font_number=0, direction="rtl", script="arab", language="fa"):
    """Return (contours, advance_width) with y already flipped for screen coords."""
    with open(font_path, "rb") as fh:
        data = fh.read()

    face = hb.Face(data, font_number)
    hb_font = hb.Font(face)
    upem = face.upem
    hb_font.scale = (upem, upem)

    buf = hb.Buffer()
    buf.add_str(text)
    buf.direction = direction
    buf.script = script
    buf.language = language
    hb.shape(hb_font, buf, {"kern": True, "liga": True})

    tt = TTFont(font_path, fontNumber=font_number, lazy=True)
    glyph_set = tt.getGlyphSet()
    glyph_order = tt.getGlyphOrder()

    scale = size_px / upem
    contours = []
    pen_x = 0.0
    pen_y = 0.0

    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = glyph_order[info.codepoint]
        pen = RecordingPen()
        glyph_set[name].draw(pen)
        glyph_contours = _pen_to_contours(pen)

        ox = pen_x + pos.x_offset
        oy = pen_y + pos.y_offset
        for contour in glyph_contours:
            # Font y-up -> screen y-down.
            contours.append([((ox + px) * scale, -((oy + py) * scale)) for px, py in contour])

        pen_x += pos.x_advance
        pen_y += pos.y_advance

    tt.close()
    return contours, pen_x * scale


def contour_bounds(contours):
    xs = [p[0] for c in contours for p in c]
    ys = [p[1] for c in contours for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def translate(contours, dx, dy):
    return [[(x + dx, y + dy) for x, y in c] for c in contours]
