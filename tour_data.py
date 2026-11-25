"""Builds docs/tour.html (animated map tour) and docs/present.html (slideshow) from trip.json.
The two templates come from the user's Shanghai trip site and are adapted for Taipei."""
import json, math, re, shutil
from pathlib import Path

ZH_DAY = {1: "龍山寺 · 西門町 · 麻辣鍋", 2: "貓空 · 華山 · 台北101 · 饒河", 3: "和平島 · 正濱漁港 · 九份", 4: "鼎泰豐 · 中正紀念堂 · 中山"}
COVER = {1: "longshan", 2: "taipei101", 3: "jiufen", 4: "cks"}
SHORT = {1: ["วัดหลงซาน", "+ ซีเหมินติง"], 2: ["เหมาคง", "+ ไทเป 101"], 3: ["จีหลง", "+ จิ่วเฟิ่น"], 4: ["ของฝาก", "+ บินกลับ"]}
COL = ["#E76F51", "#2A9D8F", "#8E5572", "#3D5A80"]
DOW = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]
DOW_FULL = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
EMOJI = [("Gan Mei", "🥟"), ("วัด", "🛕"), ("ข้าวต้ม", "🍲"), ("ซีเหมิน", "🛍️"), ("Mala", "🌶️"), ("Soy", "🥛"), ("กระเช้า", "🚡"),
         ("Kaffa", "☕"), ("ซื่อซื่อหนาน", "📸"), ("101", "🏙️"), ("Izakaya", "🍶"), ("ตลาด", "🏮"), ("สถานี", "🚆"), ("Heping", "🌊"),
         ("เจิ้งปิน", "🎨"), ("จิ่วเฟิ่น", "🏮"), ("Din Tai Fung", "🥟"), ("Hao Kung", "🥟"), ("Lotus", "🎁"), ("เจียงไคเช็ค", "🏛️"),
         ("ชานม", "🧋"), ("กระเป๋า", "🧳"), ("ช้อป", "🛍️"), ("Airport", "✈️"), ("สนามบิน", "✈️"), ("โรงแรม", "🏨")]
MODES = [("🚕", r"แท็กซี่|Uber|รถเหมา"), ("🚌", r"บัส"), ("🚄", r"รถไฟ TRA|TRA"), ("🚇", r"MRT|รถไฟฟ้า"), ("🚶", r"เดิน")]

def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(h))

def clean(t, n=48):
    t = re.sub(r"[\U0001F300-\U0001FAFF☀-➿️]", "", t).strip()
    return t if len(t) <= n else t[:n - 2].rstrip() + "…"

def emoji(name):
    for k, v in EMOJI:
        if k in name: return v
    return "📍"

def leg_mode(note, dist):
    best = None
    for ic, rx in MODES:
        m = re.search(rx, note or "")
        if m and (best is None or m.start() < best[1]): best = (ic, m.start())
    mode = best[0] if best else ("🚶" if dist < 1.2 else "🚕")
    mins = None
    if best:
        mm = re.search(r"~\s*(\d+)\s*นาที", note[best[1]:best[1] + 60])
        mins = int(mm.group(1)) if mm else None
    if mins is None:
        mins = {"🚶": dist * 13, "🚇": 8 + dist * 2.2, "🚄": 10 + dist * 1.1, "🚌": 10 + dist * 2.5}.get(mode, 5 + dist * 2.6)
        mins = max(5, int(round(mins / 5.0) * 5))
    return mode, mins

def build(trip, photos, dist: Path, src: Path):
    H = [trip["hotel"]["lat"], trip["hotel"]["lon"]]
    img = lambda k: ("img/" + photos[k]["file"]) if k and k in photos else None
    days = trip["days"]
    D = [{"ov": 1, "cover": img("hero")}]
    P = []
    for n, d in enumerate(days, 1):
        y, m, dd = map(int, d["date"].split("-"))
        import datetime
        wd = datetime.date(y, m, dd).weekday()
        pins, idx, first = [], {}, {}
        for s in d["stops"]:
            if s.get("hotel") or s.get("skip_route") or s.get("lat") is None: continue
            key = (round(s["lat"], 4), round(s["lon"], 4))
            if key not in idx:
                idx[key] = len(pins) + 1; pins.append([s["lat"], s["lon"]]); first[idx[key]] = s
            idx[s["time"]] = idx[key]
        route = [H] + pins
        segs = []
        for i in range(len(route) - 1):
            a, b = route[i], route[i + 1]; dist_ = km(a, b)
            if dist_ < 0.15: continue
            dest = first.get(pins.index(b) + 1) if b in pins else None
            mode, mins = leg_mode((dest or {}).get("note", ""), dist_)
            segs.append({"a": a, "b": b, "m": mode, "min": mins})
        items = [{"t": s["time"], "title": clean(s["name"]), "img": None if s.get("skip_photo") else img(s.get("photo")),
                  "pin": idx.get(s["time"]) if not (s.get("hotel") or s.get("skip_route")) else None,
                  "hotel": bool(s.get("hotel")), "em": emoji(s["name"]), "fx": "beam" if "101" in s["name"] else ""} for s in d["stops"]]
        D.append({"d": f"วันที่ {n} · {DOW[wd]} {dd} ธ.ค.", "tp": f"{trip['trip']['climate']['lo']}–{trip['trip']['climate']['hi']}°C",
                  "h": d["title"], "zh": ZH_DAY.get(n, ""), "cover": img(COVER.get(n)), "iso": d["date"],
                  "pins": pins, "route": route, "it": items, "suzhou": False, "segs": segs})
        P.append({"n": n, "c": COL[(n - 1) % 4], "h": d["title"], "dw": f"{DOW_FULL[wd]} {dd} ธ.ค.", "tp": f"{trip['trip']['climate']['lo']}–{trip['trip']['climate']['hi']}°C", "iso": d["date"],
                  "photo": img(COVER.get(n)) or img("hero"), "short": SHORT.get(n, ["", ""]), "icon": f"img/tour/i{n}.png",
                  "rows": [{"t": s["time"], "title": clean(s["name"], 52), "img": None if s.get("skip_photo") else img(s.get("photo")), "stay": bool(s.get("hotel"))} for s in d["stops"]]})
    last = days[-1]; y, m, dd = map(int, last["date"].split("-"))
    back = trip["flights"][-1] if trip.get("flights") else {}
    D.append({"asia": 1, "d": f"วันที่ {len(days)} · {DOW[datetime.date(y, m, dd).weekday()]} {dd} ธ.ค. · ค่ำ", "tp": "", "h": "บินกลับกรุงเทพฯ",
              "zh": "桃園 → 曼谷", "cover": img("airport2"), "iso": last["date"],
              "it": [{"t": "20:45", "title": "EVA Air BR 205 ออกจากเถาหยวน", "img": img("airport2"), "pin": None, "hotel": False, "em": "✈️", "fx": ""},
                     {"t": "23:40", "title": "ถึงสุวรรณภูมิ · กลับบ้าน", "img": None, "pin": None, "hotel": False, "em": "🏠", "fx": ""}]})

    (dist / "img" / "tour").mkdir(parents=True, exist_ok=True)
    for f in (src / "tour").iterdir():
        if f.is_file(): shutil.copy(f, dist / "img" / "tour" / f.name)
    hero_hi = dist / "img" / "tour" / "hero-1920.jpg"
    try:
        from PIL import Image; Image.open(hero_hi).verify()
    except Exception:
        shutil.copy(dist / "img" / photos["hero"]["file"], hero_hi)   # fall back to the 960px copy
    (dist / "vendor" / "maplibre").mkdir(parents=True, exist_ok=True)
    for f in ("maplibre-gl.js", "maplibre-gl.css", "LICENSE.txt"):
        shutil.copy(src.parent / "vendor" / "maplibre" / f, dist / "vendor" / "maplibre" / f)

    tpl = (src / "tour_template.html").read_text(encoding="utf-8")
    html = (tpl.replace("__TOUR_DATA__", json.dumps(D, ensure_ascii=False)).replace("__HOTEL_LON__", str(H[1]))
               .replace("__HOTEL_LAT__", str(H[0])).replace("__TOTAL__", "").replace("__OSM_TILES__", "[]"))
    (dist / "tour.html").write_text(html, encoding="utf-8")
    cr = [f"{p.get('label') or k} — {p.get('author')} ({p.get('license')})" for k, p in photos.items() if p.get("license") and not p.get("own")]
    tpl = (src / "present_template.html").read_text(encoding="utf-8")
    (dist / "present.html").write_text(tpl.replace("__DATA__", json.dumps({"days": P, "credits": cr, "total": ""}, ensure_ascii=False)), encoding="utf-8")
