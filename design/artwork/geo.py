"""Project Iran's boundary to 2D polygons for artwork."""
import json
import math

# Albers Equal Area Conic — the projection cartographers actually use for
# Iran. An unprojected lon/lat plot stretches the country east-west at these
# latitudes and looks visibly wrong to anyone who knows the shape.
PHI1 = math.radians(29.0)   # standard parallel 1
PHI2 = math.radians(38.0)   # standard parallel 2
PHI0 = math.radians(32.0)   # latitude of origin
LAM0 = math.radians(53.7)   # central meridian

_N = (math.sin(PHI1) + math.sin(PHI2)) / 2.0
_C = math.cos(PHI1) ** 2 + 2.0 * _N * math.sin(PHI1)
_RHO0 = math.sqrt(_C - 2.0 * _N * math.sin(PHI0)) / _N


def project(lon, lat):
    lam = math.radians(lon)
    phi = math.radians(lat)
    rho = math.sqrt(_C - 2.0 * _N * math.sin(phi)) / _N
    theta = _N * (lam - LAM0)
    x = rho * math.sin(theta)
    y = _RHO0 - rho * math.cos(theta)
    return x, -y  # flip y so north is up in screen coords


def load_rings(path):
    """Return list of (exterior, [holes]) in projected coordinates."""
    data = json.load(open(path))
    geom = data["features"][0]["geometry"]

    if geom["type"] == "Polygon":
        polys = [geom["coordinates"]]
    else:
        polys = geom["coordinates"]

    out = []
    for poly in polys:
        ext = [project(x, y) for x, y in poly[0]]
        holes = [[project(x, y) for x, y in ring] for ring in poly[1:]]
        out.append((ext, holes))
    return out


def bounds(polys):
    xs, ys = [], []
    for ext, holes in polys:
        for x, y in ext:
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


def fit(polys, box_w, box_h, offset_x=0.0, offset_y=0.0):
    """Scale polygons to fit inside box_w x box_h, centered, preserving aspect."""
    minx, miny, maxx, maxy = bounds(polys)
    w = maxx - minx
    h = maxy - miny
    scale = min(box_w / w, box_h / h)

    draw_w = w * scale
    draw_h = h * scale
    dx = offset_x + (box_w - draw_w) / 2.0
    dy = offset_y + (box_h - draw_h) / 2.0

    def tx(pt):
        x, y = pt
        return ((x - minx) * scale + dx, (y - miny) * scale + dy)

    return [([tx(p) for p in ext], [[tx(p) for p in hole] for hole in holes]) for ext, holes in polys], scale


def polygon_area(ring):
    a = 0.0
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % len(ring)]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0
