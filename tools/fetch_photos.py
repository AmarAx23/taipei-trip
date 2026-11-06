"""Download the chosen Commons photo for each key, resize, and write photos/photos.json with credits.

usage: python3 -I tools/fetch_photos.py <cands.json> <picks.json> <photos_dir>
picks.json maps key -> {"i": candidate index, "label": Thai label}
"""
import html, io, json, re, sys, time, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

UA = "TaipeiTripPage/1.0 (personal trip itinerary)"
cands = json.load(open(sys.argv[1], encoding="utf-8"))
picks = json.load(open(sys.argv[2], encoding="utf-8"))
out = Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
meta_path = out / "photos.json"
meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}

def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return html.unescape(s).strip()[:80]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(10):
        try:
            return urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            code = getattr(e, "code", None)
            if code == 404: raise
            time.sleep(30 if code == 429 else 5)
    raise RuntimeError("download failed " + url)

for key, pk in picks.items():
    c = cands[key][pk["i"]]
    if key in meta and meta[key].get("title") == c["title"][5:]:
        continue
    url = re.sub(r"/\d+px-", "/960px-", c["thumb"]).split("?")[0].replace("thumb.wikimedia.org", "upload.wikimedia.org")
    try:
        data = get(url)
    except Exception as e:
        print("FAIL", key, e, flush=True); continue
    im = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    if im.width > 960:
        im = im.resize((960, round(im.height * 960 / im.width)), Image.LANCZOS)
    name = f"{key}.jpg"
    im.save(out / name, "JPEG", quality=78, optimize=True, progressive=True)
    meta[key] = {"file": name, "w": im.width, "h": im.height, "label": pk.get("label", key),
                 "title": c["title"][5:], "page": c["page"], "author": clean(c["artist"]) or "ไม่ระบุ",
                 "license": c["license"], "licurl": c["licurl"]}
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print("ok", key, im.size, (out / name).stat().st_size // 1024, "KB", flush=True)
    time.sleep(3)
