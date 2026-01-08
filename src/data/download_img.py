import os, re, json
from urllib.parse import urlparse
import requests

INPUT_JSON = "players_url.json"
OUT_DIR = os.path.join("public", "img", "players")
OUT_MAP = "players_local_map.json"

os.makedirs(OUT_DIR, exist_ok=True)

def slugify(name: str) -> str:
    name = str(name or "").replace("\u00a0", " ").strip().lower()
    name = re.sub(r"\s+", " ", name)
    # accents weg (é, ë, ï, etc.)
    name = name.encode("utf-8", "ignore").decode("utf-8")
    name = re.sub(r"[^a-z0-9]+", "-", name)
    return name.strip("-") or "unknown"

def ext_from_url(url: str) -> str:
    path = urlparse(url).path
    _, ext = os.path.splitext(path)
    ext = ext.lower().strip(".")
    if ext in ["jpg", "jpeg", "png", "webp", "avif", "gif"]:
        return "jpg" if ext == "jpeg" else ext
    return "jpg"

def safe_filename(name: str, url: str, used: dict) -> str:
    base = slugify(name)
    ext = ext_from_url(url)
    n = used.get(base, 0) + 1
    used[base] = n
    suffix = "" if n == 1 else f"__{n}"
    return f"{base}{suffix}.{ext}"

with open(INPUT_JSON, "r", encoding="utf-8") as f:
    items = json.load(f)

session = requests.Session()
session.headers.update({"User-Agent": "Mozilla/5.0"})

used = {}
name_to_local = {}
ok = 0
fail = 0

for it in items:
    name = (it.get("name") or "").strip()
    url = (it.get("img") or "").strip()
    if not name or not url:
        continue

    filename = safe_filename(name, url, used)
    filepath = os.path.join(OUT_DIR, filename)
    local_path = f"/img/players/{filename}"

    try:
        r = session.get(url, timeout=25, stream=True)
        r.raise_for_status()

        ctype = (r.headers.get("Content-Type") or "").lower()
        if "text/html" in ctype:
            raise RuntimeError(f"HTML i.p.v. image ({ctype})")

        with open(filepath, "wb") as out:
            for chunk in r.iter_content(chunk_size=1024 * 64):
                if chunk:
                    out.write(chunk)

        name_to_local[name] = local_path
        ok += 1
        print("OK  ", name, "->", local_path)

    except Exception as e:
        fail += 1
        print("FAIL", name, url, "=>", e)

with open(OUT_MAP, "w", encoding="utf-8") as f:
    json.dump(name_to_local, f, ensure_ascii=False, indent=2)

print(f"\nDone. OK={ok}, FAIL={fail}")
print(f"Map written to: {OUT_MAP}")
