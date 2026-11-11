"""Turns OpenStreetMap exports into a clean, scored list of potential pallet buyers.

Usage: python3 scripts/build-prospects.py <dir with PL.json, SK.json, ...> <out.json> [places dir]
The optional places dir (same file names, Overpass place nodes) fills in a missing town.
Input files come from the Overpass API (see scripts/README-prospects.md).
"""
import json, math, re, sys, unicodedata
from pathlib import Path

DEPOTS = {"rzeszow": (50.0412, 21.9991), "andrychow": (49.8549, 19.3384)}

# industrial=* / product / name hints -> sector, with how likely they need pallets (0-40)
SECTORS = {
    "food": 40, "logistics": 40, "wholesale": 35, "building": 35, "wood": 30, "paper": 35,
    "chemical": 30, "metal": 28, "automotive": 30, "agri": 30, "electronics": 25,
    "textile": 22, "pharma": 30, "manufacturing": 25, "other": 10,
}
TAG_SECTOR = {
    "food": "food", "brewery": "food", "bakery": "food", "dairy": "food", "slaughterhouse": "food",
    "winery": "food", "distillery": "food", "beverages": "food", "meat": "food", "confectionery": "food",
    "warehouse": "logistics", "logistics": "logistics", "distributor": "wholesale", "storage": "logistics",
    "concrete_plant": "building", "brickyard": "building", "cement": "building", "building_materials": "building",
    "asphalt_plant": "building", "glass": "building", "ceramics": "building",
    "sawmill": "wood", "wood": "wood", "furniture": "wood", "carpentry": "wood", "timber": "wood",
    "paper": "paper", "packaging": "paper", "printing": "paper", "cardboard": "paper",
    "chemical": "chemical", "plastic": "chemical", "plastics": "chemical", "rubber": "chemical", "paint": "chemical",
    "steelmaking": "metal", "metal_processing": "metal", "machine_shop": "metal", "foundry": "metal",
    "metal": "metal", "machinery": "metal", "engineering": "metal",
    "automotive": "automotive", "car_manufacturer": "automotive", "vehicle": "automotive",
    "agriculture": "agri", "grain": "agri", "feed": "agri", "fertilizer": "agri", "greenhouse": "agri",
    "electronics": "electronics", "electrical": "electronics", "textile": "textile", "pharmaceutical": "pharma",
    "medical": "pharma", "factory": "manufacturing", "manufacture": "manufacturing",
    "joiner": "wood", "cooper": "wood", "metal_construction": "metal", "cheese": "food",
}
NAME_HINTS = [
    (r"logist|magazyn|sklad|lager|raktár|distribu|fulfil|sandėl|noliktav|spedic|transport", "logistics"),
    (r"food|potravin|żywno|mleka|mlek|mięs|maso|mäso|piekar|pekár|browar|pivovar|brauerei|sörgyár|tejüzem|hús|nápoj|napoj|getränk|dairy|bakery|masarn|wędlin|ubojn|piekarn|cukr|cukier|młyn|mlyn|mühle|malom|chłodni|mlékár|mliekár|molkerei|maist|pārtik|mėsa|gaļa|pien|duon|maiz|alus|alaus|konserv|fleisch|bäckerei|lebensmittel|milch|wurst|brot", "food"),
    (r"drew|drev|dřev|holz|fa(?:ipar|feldolg)|tartak|píla|pila|sägewerk|nábytk|mebl|möbel|medien|kokapstr|kokzāģ|mēbel|baldų|baldai|lentpj|zimmerei|tischlerei", "wood"),
    (r"beton|cement|ceg[łl]|tehl|cihl|ziegel|tégla|stavebn|budowl|baustoff|kamen|statyb|būvmat|betonas|plyt|ķieģe", "building"),
    (r"pap[ií]er|karton|obal|opakow|verpack|csomagol|druk|print", "paper"),
    (r"chem|plast|gum|kunststoff|műanyag|farb|chemij|ķīmij|plastik", "chemical"),
    (r"stal|ocel|oceľ|metal|kov|stahl|acél|fém|maszyn|strojár|strojír|maschinen|gépgyár|metalo|metāl|mašīn|stakl", "metal"),
    (r"auto|motor|car |kfz", "automotive"),
    (r"agro|rolnic|poľnohosp|zemědě|landwirt|mezőgazd|zbo[żz]|obil|pasz|krmiv|grūd|graud|lauksaimn|žemės ūk", "agri"),
    (r"pharm|farm|medic|med\b", "pharma"),
    (r"hurtow|veľkoobch|velkoobch|großhandel|nagyker|wholesale|didmen|vairumtirdz", "wholesale"),
]
# Places that are not one company: parks, zones, plants for utilities, public services
SKIP_NAME = re.compile(
    r"park|zóna|zona|strefa|areál|areal|gewerbe|industrie(gebiet|zone)|ipari|terület|pramoninis|rajonas|industriālais|"
    r"oczyszczal|čistiar|čistír|kläranlage|szennyvíz|ciepłown|teplár|výhrev|heizwerk|"
    r"elektrown|elektrár|kraftwerk|erőmű|rozdzielni|rozvodň|umspann|trafost|"
    r"wodociąg|vodár|wasserwerk|vízmű|kotłown|kotol|uzdatnian|ujęcie wody|úpravň|wasseraufbereit|"
    r"tłocz|kompresor|kopalni|lom |steinbruch|bánya|kruszyw|żwirow|štěrk|kies|"
    r"taxi|self ?storage|samoobsługow|sejf|parking|garaż|myjnia|autoumyv|waschanlage|"
    r"serwis|servis|service|warsztat|dielna|werkstatt|stacja paliw|tankst|benzin|"
    r"szkoła|škola|schule|iskola|urząd|úrad|úřad|amt\b|poczta|pošta|kościół|cmentarz|"
    r"agencja rezerw|správa hmotných rezerv|składnica|przepompown|ścieków|zlewcz|^szyb|"
    r"\bstk\b|výměník|výmenník|gázfogad|waterworks|^station|városgazd|gästezimmer|pension|penzión|hotel|"
    r"bringó|kemping|camping|fitnes|wellness|sportov|muziej|muzej|museum|muzeum|skola|mokykla|schacht|bergwerk|gimnazij|korpusas|pastatas|\bēka\b|"
    r"^ev?n$|rozvodna|regulační stanice|"
    r"^budynek|^budova|^gebäude|^épület|^hala |^hala$|^objekt|"
    r"^(magazyn|sklad|lager|hala|warehouse|raktár|garaž|garáž|garage|depot)( \d+)?$",
    re.I,
)
SKIP_INDUSTRIAL = {"power", "heating_station", "water", "wastewater", "sewage", "gas", "oil", "electrical",
                   "railway", "depot", "mine", "quarry", "scrap_yard", "port", "military", "telecommunication",
                   "fuel", "pipeline", "salt", "well_cluster", "substation"}


def norm(s):
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = re.sub(r"\b(s\.?r\.?o\.?|sp\.? ?z ?o\.?o\.?|spolka|a\.?s\.?|gmbh|kft\.?|zrt\.?|s\.?a\.?|ag|kg|co|uab|sia|ab)\b", "", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def km(a, b):
    r = math.pi / 180
    h = math.sin((b[0] - a[0]) * r / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin((b[1] - a[1]) * r / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def sector_of(t):
    for key in ("industrial", "product", "craft"):
        for v in re.split(r"[;,]", t.get(key, "")):
            v = v.strip().lower()
            if v in TAG_SECTOR:
                return TAG_SECTOR[v]
    if t.get("shop") == "wholesale":
        return "wholesale"
    if t.get("shop") == "trade":  # builders' merchants
        return "building"
    if t.get("office") == "logistics" or t.get("building") == "warehouse":
        return "logistics"
    n = t.get("name", "").lower()
    for rx, s in NAME_HINTS:
        if re.search(rx, n):
            return s
    if t.get("man_made") == "works" or t.get("building") in ("industrial", "factory") or "industrial" in t:
        return "manufacturing"
    return "other"


def load_places(places_dir):
    """Grid of named towns and villages, to look up the nearest one."""
    grid = {}
    if not places_dir:
        return grid
    for path in Path(places_dir).glob("*.json"):
        for e in json.load(open(path))["elements"]:
            name = e.get("tags", {}).get("name")
            if name:
                grid.setdefault((round(e["lat"], 1), round(e["lon"], 1)), []).append((e["lat"], e["lon"], name))
    return grid


def nearest_place(grid, lat, lng):
    best, best_d = None, 8.0  # km: farther than this, leave the town empty
    for dy in (-0.1, 0, 0.1):
        for dx in (-0.1, 0, 0.1):
            for plat, plng, name in grid.get((round(lat + dy, 1), round(lng + dx, 1)), []):
                d = km((lat, lng), (plat, plng))
                if d < best_d:
                    best, best_d = name, d
    return best


def build(src_dir, places_dir=None):
    out, seen = [], {}
    places = load_places(places_dir)
    for path in sorted(Path(src_dir).glob("*.json")):
        country = path.stem.split("-")[0]  # DE-SN, DE-BB … are German states
        for e in json.load(open(path))["elements"]:
            t = e.get("tags", {})
            name = (t.get("name") or "").strip()
            if len(name) < 3 or SKIP_NAME.search(name):
                continue
            if t.get("industrial", "").lower() in SKIP_INDUSTRIAL or t.get("power") or t.get("amenity") or t.get("shop") == "car_repair":
                continue
            # A named industrial area is only useful when it carries a company name
            if t.get("landuse") == "industrial" and not (t.get("operator") or t.get("website") or t.get("industrial")):
                if not re.search(r"[A-Z]{2,}|s\.r\.o|sp\. ?z|gmbh|kft|a\.s\.|\bUAB\b|\bSIA\b", name):
                    continue
            lat = e.get("lat") or e.get("center", {}).get("lat")
            lng = e.get("lon") or e.get("center", {}).get("lon")
            if lat is None:
                continue
            dists = {d: km((lat, lng), p) for d, p in DEPOTS.items()}
            depot = min(dists, key=dists.get)
            sector = sector_of(t)
            website = t.get("website") or t.get("contact:website") or t.get("url")
            phone = t.get("phone") or t.get("contact:phone")
            email = t.get("email") or t.get("contact:email")
            d = dists[depot]
            # Closer, a sector that ships on pallets, and a way to reach them
            score = SECTORS[sector] + max(0, 40 - d / 12) + (8 if phone else 0) + (6 if website else 0) + (4 if email else 0)
            row = {
                "source_id": f"osm:{e['type']}/{e['id']}",
                "country": country,
                "name": name[:200],
                "sector": sector,
                "street": " ".join(filter(None, [t.get("addr:street") or t.get("addr:place"), t.get("addr:housenumber")])) or None,
                "city": t.get("addr:city") or nearest_place(places, lat, lng),
                "postal_code": t.get("addr:postcode"),
                "lat": round(lat, 6),
                "lng": round(lng, 6),
                "nearest_depot": depot,
                "distance_km": round(d),
                "website": website,
                "phone": phone,
                "email": email,
                "score": round(score),
                "raw": {k: v for k, v in t.items() if k in ("industrial", "product", "operator", "building", "man_made", "shop", "office", "brand")},
            }
            # Same company twice (building + area): keep the richer record
            key = (country, norm(name), round(lat, 2), round(lng, 2))
            prev = seen.get(key)
            if prev is None or row["score"] > prev["score"]:
                seen[key] = row
    # Unclassified places are only worth keeping when they can be reached
    out = [r for r in seen.values() if r["sector"] != "other" or r["phone"] or r["website"]]
    out.sort(key=lambda r: -r["score"])
    return out


if __name__ == "__main__":
    rows = build(sys.argv[1], sys.argv[3] if len(sys.argv) > 3 else None)
    json.dump(rows, open(sys.argv[2], "w"), ensure_ascii=False)
    from collections import Counter
    print(len(rows), Counter(r["country"] for r in rows))
    print(Counter(r["sector"] for r in rows).most_common())
    for c in sorted({r["country"] for r in rows}):
        rs = [r for r in rows if r["country"] == c]
        print(c, "with phone", sum(1 for r in rs if r["phone"]), "website", sum(1 for r in rs if r["website"]), "city", sum(1 for r in rs if r["city"]))
