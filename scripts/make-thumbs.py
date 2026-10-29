"""Makes small, fast preview images for every property photo and records them in the data file.

Cards, map rows and the photo grid show these (about 40 KB each) instead of the full photos (200-350 KB);
the full photo still opens in the viewer and at the top of the property page.

    python3 scripts/make-thumbs.py        # after adding or changing photos in site/data/properties.json

Each photo gets  site/media/<property>/thumbs/<name>.webp  (720 px wide) and a "thumb" field in the data
file. Existing thumbnails are rebuilt only when the photo is newer. Needs Pillow (pip install pillow).
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DATA = SITE / "data" / "properties.json"
WIDTH = 720
QUALITY = 72


def thumb_for(src: str) -> str | None:
    photo = SITE / src.lstrip("/")
    if not photo.is_file():
        print(f"  missing: {src}")
        return None
    out = photo.parent / "thumbs" / f"{photo.stem}.webp"
    if not out.exists() or out.stat().st_mtime < photo.stat().st_mtime:
        out.parent.mkdir(exist_ok=True)
        with Image.open(photo) as im:
            im = im.convert("RGB")
            if im.width > WIDTH:
                im = im.resize((WIDTH, round(im.height * WIDTH / im.width)), Image.LANCZOS)
            im.save(out, "WEBP", quality=QUALITY, method=6)
        print(f"  {out.relative_to(SITE)}  {out.stat().st_size // 1024} KB")
    return "/" + str(out.relative_to(SITE))


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    for prop in data.get("properties", []):
        for photo in prop.get("photos", []):
            thumb = thumb_for(photo["src"])
            if thumb:
                photo["thumb"] = thumb
    DATA.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print("properties.json updated")


if __name__ == "__main__":
    main()
