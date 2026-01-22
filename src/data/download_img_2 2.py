import os
import re
import json
import requests
from urllib.parse import urlparse

# ========= CONFIG =========
INPUT_JSON = "players_url.json"   # jouw input (name + img)
OUT_DIR = os.path.join("public", "img", "players")
OUT_MAP = "players_local_map.json"

# ==========================

os.makedirs(OUT_DIR, exist_ok=True)

def slugify(name: str) -> str:
    name = str(name or "").lower()
    name = name.replace("\u00a0", " ")
    name = re.sub(r"\s+", " ", name)
    name = re.sub(r"[^a-z0-9]+", "-", name)
    return name.strip("-") or "unknown"

def ext_from_url(url: str) -> str:
    path = urlparse(url).path
    _, ext = os.path.splitext(path)
    ext = ext.lower()
    if ext in [".jpg", ".jpeg", ".png", ".webp", ".avif"]:
        return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"

def safe_filename(name: str, url: str, used: dict) -> str:
    base = slugify(name)
    ext = ext_from_url(url)
    count = used.get(base, 0) + 1
    used[base] = count
    suffix = "" if count == 1 else f"__{count}"
    return f"{base}{suffix}{ext}"

# ========= LOAD INPUT =========
with open(INPUT_JSON, "r", encoding="utf-8") as f:
    items = json.load(f)

session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0 (FreeTheMap Image Downloader)"
})

used_names = {}
name_to_local = {}

ok = 0
fail = 0

print(f"📥 Downloading {len(items)} images...\n")

for i, item in enumerate(items, start=1):
    name = (item.get("name") or "").strip()
    url  = (item.get("img") or "").strip()

    if not name or not url:
        print(f"[{i}] ⏭️  skip (missing name/url)")
        continue

    filename = safe_filename(name, url, used_names)
    filepath = os.path.join(OUT_DIR, filename)
    public_path = f"/img/players/{filename}"

    if os.path.exists(filepath):
        print(f"[{i}] ✅ exists: {public_path}")
        name_to_local[name] = public_path
        ok += 1
        continue

    try:
        print(f"[{i}] ⬇️  {name}")
        r = session.get(url, timeout=30, stream=True)
        r.raise_for_status()

        ctype = (r.headers.get("Content-Type") or "").lower()
        if "text/html" in ctype:
            raise RuntimeError("HTML returned instead of image")

        with open(filepath, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 64):
                if chunk:
                    f.write(chunk)

        name_to_local[name] = public_path
        ok += 1
        print(f"     ✔ saved → {public_path}")

    except Exception as e:
        fail += 1
        print(f"     ❌ FAILED: {e}")

# ========= WRITE MAP =========
with open(OUT_MAP, "w", encoding="utf-8") as f:
    json.dump(name_to_local, f, ensure_ascii=False, indent=2)

print("\n==============================")
print(f"✅ Success : {ok}")
print(f"❌ Failed  : {fail}")
print(f"🗺  Map     : {OUT_MAP}")
print("==============================")
