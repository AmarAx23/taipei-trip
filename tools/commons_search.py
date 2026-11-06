import json, sys, time, urllib.request, urllib.parse
UA = "TaipeiTripPage/1.0 (personal trip itinerary)"
API = "https://commons.wikimedia.org/w/api.php"
def api(params):
    params = {**params, "format": "json", "formatversion": "2"}
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": UA})
    for i in range(10):
        try:
            return json.load(urllib.request.urlopen(req, timeout=30))
        except Exception as e:
            time.sleep(40)
    raise SystemExit("api failed")
queries = json.load(open(sys.argv[1], encoding="utf-8"))
import os
out = json.load(open(sys.argv[2], encoding="utf-8")) if os.path.exists(sys.argv[2]) else {}
for key, q in queries.items():
    if out.get(key): continue
    r = api({"action": "query", "generator": "search", "gsrsearch": q + " filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 8,
             "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 900})
    pages = sorted(r.get("query", {}).get("pages", []), key=lambda p: p.get("index", 99))
    cands = []
    for p in pages:
        ii = (p.get("imageinfo") or [{}])[0]
        md = ii.get("extmetadata", {})
        lic = md.get("LicenseShortName", {}).get("value", "")
        cands.append({"title": p["title"], "w": ii.get("width"), "h": ii.get("height"), "thumb": ii.get("thumburl"),
                      "page": ii.get("descriptionurl"), "license": lic,
                      "artist": md.get("Artist", {}).get("value", ""), "licurl": md.get("LicenseUrl", {}).get("value", "")})
    out[key] = cands
    print(key, "|", " || ".join(f'{c["title"][5:60]} [{c["license"]}] {c["w"]}x{c["h"]}' for c in cands[:6]), flush=True)
    json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    time.sleep(12)
json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
