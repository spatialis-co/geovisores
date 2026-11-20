#!/usr/bin/env python3
"""Genera las capas base de Colombia para los demos de Spatialis.

Fuente: Natural Earth (dominio publico, apto para uso comercial).
Salida: GeoJSON simplificado y redondeado, listo para servir estatico.
"""
import json
import os
import sys
import urllib.request

NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
ADMIN1 = NE + "ne_10m_admin_1_states_provinces.geojson"
PLACES = NE + "ne_10m_populated_places_simple.geojson"
CACHE = os.path.dirname(os.path.abspath(__file__))

# Natural Earth trae name_es inconsistente ("del Tolima") y name sin tilde
# ("Bogota"), asi que los nombres se fijan por codigo ISO 3166-2:CO.
DEPTOS = {
    "CO-AMA": "Amazonas", "CO-ANT": "Antioquia", "CO-ARA": "Arauca",
    "CO-ATL": "Atlántico", "CO-BOL": "Bolívar", "CO-BOY": "Boyacá",
    "CO-CAL": "Caldas", "CO-CAQ": "Caquetá", "CO-CAS": "Casanare",
    "CO-CAU": "Cauca", "CO-CES": "Cesar", "CO-CHO": "Chocó",
    "CO-COR": "Córdoba", "CO-CUN": "Cundinamarca", "CO-DC": "Bogotá D.C.",
    "CO-GUA": "Guainía", "CO-GUV": "Guaviare", "CO-HUI": "Huila",
    "CO-LAG": "La Guajira", "CO-MAG": "Magdalena", "CO-MET": "Meta",
    "CO-NAR": "Nariño", "CO-NSA": "Norte de Santander", "CO-PUT": "Putumayo",
    "CO-QUI": "Quindío", "CO-RIS": "Risaralda", "CO-SAN": "Santander",
    "CO-SAP": "San Andrés, Providencia y Santa Catalina", "CO-SUC": "Sucre",
    "CO-TOL": "Tolima", "CO-VAC": "Valle del Cauca", "CO-VAU": "Vaupés",
    "CO-VID": "Vichada",
}

TIPOS = {
    "CO-DC": "Distrito Capital",
    "CO-SAP": "Departamento archipiélago",
}

CIUDADES_FIX = {"Bogota": "Bogotá D.C."}

# adm1name de Natural Earth trae erratas y nombres sin tilde. Las que afectan
# a Colombia se corrigen aqui; "San Andres" sencillamente viene sin departamento.
DEP_CIUDAD_FIX = {
    "Bogota": "Bogotá D.C.",
    "Caqueti": "Caquetá",
}
DEP_POR_CIUDAD = {
    "San Andrés": "San Andrés, Providencia y Santa Catalina",
}

# Natural Earth etiqueta Bogota como "Federal District" dentro de CO-CUN y deja
# un poligono sin asignar (CO-X01~). Se corrige por adm1_code, que si es unico.
ISO_POR_ADM1 = {"COL-1399": "CO-DC", "COL-1398": "CO-CUN"}


def fetch(url):
    name = os.path.join(CACHE, url.rsplit("/", 1)[-1])
    if not os.path.exists(name):
        sys.stderr.write("descargando %s\n" % url)
        req = urllib.request.Request(url, headers={"User-Agent": "spatialis-build"})
        with urllib.request.urlopen(req, timeout=120) as r, open(name, "wb") as f:
            f.write(r.read())
    with open(name, encoding="utf-8") as f:
        return json.load(f)


def perp_dist(p, a, b):
    (x, y), (x1, y1), (x2, y2) = p, a, b
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return ((x - x1) ** 2 + (y - y1) ** 2) ** 0.5
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return ((x - (x1 + t * dx)) ** 2 + (y - (y1 + t * dy)) ** 2) ** 0.5


def simplify(pts, tol):
    """Douglas-Peucker iterativo, sin recursion para anillos largos."""
    if len(pts) < 3:
        return pts[:]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        if j - i < 2:
            continue
        worst, idx = -1.0, i
        for k in range(i + 1, j):
            d = perp_dist(pts[k], pts[i], pts[j])
            if d > worst:
                worst, idx = d, k
        if worst > tol:
            keep[idx] = True
            stack.append((i, idx))
            stack.append((idx, j))
    return [p for p, k in zip(pts, keep) for _ in (0,) if k]


def ring(pts, tol, prec):
    out = simplify(pts, tol)
    # un anillo valido necesita 4 posiciones y cierre explicito
    if len(out) < 4:
        out = pts[:]
    out = [[round(x, prec), round(y, prec)] for x, y in out]
    dedup = [out[0]]
    for p in out[1:]:
        if p != dedup[-1]:
            dedup.append(p)
    if dedup[0] != dedup[-1]:
        dedup.append(dedup[0])
    return dedup if len(dedup) >= 4 else None


def ring_area(r):
    return abs(sum(r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]
                   for k in range(len(r) - 1))) / 2


def clean_geom(geom, tol, prec, min_ring_area):
    """Simplifica y descarta islas diminutas, pero nunca la mas grande.

    San Andres y Providencia es un archipielago de islas muy pequenas: si se
    filtra solo por area, el departamento desaparece del mapa.
    """
    if geom["type"] == "Polygon":
        coords = [geom["coordinates"]]
    elif geom["type"] == "MultiPolygon":
        coords = geom["coordinates"]
    else:
        return None

    cand = []
    for poly in coords:
        rings = []
        for i, r in enumerate(poly):
            sr = ring(r, tol, prec) or ring(r, tol / 4, prec)
            if sr is None:
                continue
            if i == 0:
                rings.append(sr)
            elif ring_area(sr) >= min_ring_area * 0.25:
                rings.append(sr)
        if rings:
            cand.append((ring_area(rings[0]), rings))

    if not cand:
        return None
    cand.sort(key=lambda t: -t[0])
    res = [cand[0][1]] + [r for a, r in cand[1:] if a >= min_ring_area]
    if len(res) == 1:
        return {"type": "Polygon", "coordinates": res[0]}
    return {"type": "MultiPolygon", "coordinates": res}


def centroid(geom):
    """Centroide del anillo exterior mas grande, para etiquetas."""
    rings = ([geom["coordinates"][0]] if geom["type"] == "Polygon"
             else [p[0] for p in geom["coordinates"]])
    best, best_area = None, -1.0
    for r in rings:
        a = abs(sum(r[k][0] * r[k + 1][1] - r[k + 1][0] * r[k][1]
                    for k in range(len(r) - 1))) / 2
        if a > best_area:
            best, best_area = r, a
    cx = cy = f = 0.0
    for k in range(len(best) - 1):
        x1, y1 = best[k]
        x2, y2 = best[k + 1]
        cr = x1 * y2 - x2 * y1
        f += cr
        cx += (x1 + x2) * cr
        cy += (y1 + y2) * cr
    if f == 0:
        return [round(best[0][0], 4), round(best[0][1], 4)]
    return [round(cx / (3 * f), 4), round(cy / (3 * f), 4)]


def dump(path, fc):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(fc, f, ensure_ascii=False, separators=(",", ":"))
    return os.path.getsize(path)


def build_departamentos(dest, tol=0.007, prec=4):
    src = fetch(ADMIN1)
    feats = []
    for ft in src["features"]:
        p = ft["properties"]
        if p.get("adm0_a3") != "COL":
            continue
        iso = ISO_POR_ADM1.get(p.get("adm1_code")) or p.get("iso_3166_2") or ""
        if iso not in DEPTOS:
            sys.stderr.write("omitido: %s / %s\n" % (p.get("adm1_code"), iso))
            continue
        geom = clean_geom(ft["geometry"], tol, prec, min_ring_area=0.0015)
        if geom is None:
            continue
        feats.append({
            "type": "Feature",
            "properties": {
                "nombre": DEPTOS.get(iso) or p.get("name") or "",
                "iso": iso,
                "tipo": TIPOS.get(iso, "Departamento"),
                "centroide": centroid(geom),
            },
            "geometry": geom,
        })
    feats.sort(key=lambda f: f["properties"]["nombre"])
    fc = {
        "type": "FeatureCollection",
        "name": "colombia_departamentos",
        "attribution": "Natural Earth (dominio publico) - preparado por Spatialis S.A.S.",
        "features": feats,
    }
    size = dump(dest, fc)
    print("departamentos: %d entidades, %.1f KB -> %s" % (len(feats), size / 1024, dest))
    return [f["properties"]["nombre"] for f in feats]


def build_ciudades(dest, prec=4):
    src = fetch(PLACES)
    feats = []
    for ft in src["features"]:
        p = ft["properties"]
        if p.get("adm0name") != "Colombia":
            continue
        if ft["geometry"]["type"] != "Point":
            continue
        pop = p.get("pop_max") or 0
        x, y = ft["geometry"]["coordinates"][:2]
        nombre = CIUDADES_FIX.get(p.get("name"), p.get("name") or "")
        dep = p.get("adm1name") or ""
        dep = DEP_CIUDAD_FIX.get(dep, dep) or DEP_POR_CIUDAD.get(nombre, "")
        feats.append({
            "type": "Feature",
            "properties": {
                "nombre": nombre,
                "departamento": dep,
                "poblacion": int(pop),
                "capital": 1 if (p.get("adm0cap") or 0) else 0,
                "rango": ("Area metropolitana" if pop >= 1_000_000 else
                          "Ciudad mayor" if pop >= 300_000 else
                          "Ciudad intermedia" if pop >= 100_000 else
                          "Centro urbano"),
            },
            "geometry": {"type": "Point", "coordinates": [round(x, prec), round(y, prec)]},
        })
    feats.sort(key=lambda f: -f["properties"]["poblacion"])
    fc = {
        "type": "FeatureCollection",
        "name": "colombia_ciudades",
        "attribution": "Natural Earth (dominio publico) - preparado por Spatialis S.A.S.",
        "features": feats,
    }
    size = dump(dest, fc)
    print("ciudades: %d entidades, %.1f KB -> %s" % (len(feats), size / 1024, dest))
    top = feats[:8]
    for f in top:
        print("   %-16s %-18s %9d" % (f["properties"]["nombre"],
                                      f["properties"]["departamento"],
                                      f["properties"]["poblacion"]))


if __name__ == "__main__":
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    nombres = build_departamentos(os.path.join(out, "colombia-departamentos.geojson"))
    build_ciudades(os.path.join(out, "colombia-ciudades.geojson"))
    print("\n%d departamentos: %s" % (len(nombres), ", ".join(nombres)))
