# Builds the Propertiq logo as SVG: "Properti" traced from Plus Jakarta Sans ExtraBold, followed by a "q"
# made of the letter bowl plus a house roof whose right wall becomes the q's tail, with a 4-pane window.
#   pip install fonttools && python3 scripts/brand/make-logo.py
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
font = TTFont(ROOT / "assets/fonts/jakarta-800.ttf")
gs = font.getGlyphSet()
cmap = font.getBestCmap()
UPM = font["head"].unitsPerEm
ASC = 760  # top of the drawing area (font units, above cap height)

def glyph_path(ch, x):
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs)
    # Font units point up; SVG points down. Flip around the ascender line.
    gs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, ASC)))
    return pen.getCommands(), gs[name].width

def build(text_fill, roof_from, roof_to, window_fill, uid, word="Properti"):
    parts, x = [], 0
    for ch in word:
        d, w = glyph_path(ch, x)
        parts.append(d)
        x += w - 18  # slightly tight tracking, like the original wordmark
    # The q: an "o" bowl, then the house.
    bowl, bw = glyph_path("o", x)
    parts.append(bowl)
    x_height = 548
    stem = 150
    left, right = x + 10, x + bw - 10
    base = ASC  # baseline in SVG coordinates
    top = ASC - x_height
    wall = right - stem / 2 + 8           # the house's right wall doubles as the stem of the q
    peak_x, peak_y = x + bw * 0.58, top - 235
    # Roof from the bowl's upper-left up to the peak, down to the wall, which drops below the
    # baseline and kicks out to the right as the tail of the q.
    roof = (
        f"M{left + 30:.0f},{top + 40:.0f} L{peak_x:.0f},{peak_y:.0f} L{wall:.0f},{top + 30:.0f} "
        f"L{wall:.0f},{base + 150:.0f} L{wall + 90:.0f},{base + 235:.0f}"
    )
    # Four-pane window, cut out of the letter at the bowl's upper left (like the original mark).
    ws, gap = 66, 18
    wx, wy = x + bw * 0.16, top + 40
    window = "".join(
        f'<rect x="{wx + c * (ws + gap):.0f}" y="{wy + r * (ws + gap):.0f}" width="{ws}" height="{ws}" rx="8"/>'
        for r in (0, 1) for c in (0, 1)
    )
    width = wall + 90 + stem
    vb_top = peak_y - stem
    vb = f"0 {vb_top:.0f} {width:.0f} {base + 235 + stem // 2 - vb_top:.0f}"
    return vb, f'''<defs>
    <linearGradient id="{uid}-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{roof_from}"/><stop offset="1" stop-color="{roof_to}"/></linearGradient>
    <mask id="{uid}-window"><rect x="-9999" y="-9999" width="99999" height="99999" fill="#fff"/><g fill="#000">{window}</g></mask>
  </defs>
  <path fill="{text_fill}" mask="url(#{uid}-window)" d="{' '.join(parts)}"/>
  <path d="{roof}" fill="none" stroke="url(#{uid}-roof)" stroke-width="{stem}" stroke-linecap="round" stroke-linejoin="round" mask="url(#{uid}-window)"/>'''

def write(name, text_fill, roof_from, roof_to, window_fill, bg=None):
    vb, body = build(text_fill, roof_from, roof_to, window_fill, name.split(".")[0])
    background = f'<rect x="-9999" y="-9999" width="99999" height="99999" fill="{bg}"/>' if bg else ""
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Propertiq">{background}\n  {body}\n</svg>\n'
    (ROOT / "site/brand" / name).write_text(svg)
    print(name, vb)

write("propertiq.svg", "#0b0b0b", "#6b6b6b", "#0b0b0b", None)
write("propertiq-white.svg", "#ffffff", "#ffffff", "#9b9b9b", None)


# Square mark for app icons and the favicon: the house-q alone, white on black.
def write_mark(name, size_pad=0.16):
    vb, body = build("#ffffff", "#ffffff", "#9b9b9b", None, name.split(".")[0], word="")
    x0, y0, w, h = (float(v) for v in vb.split())
    side = max(w, h) * (1 + 2 * size_pad)
    cx, cy = x0 + w / 2, y0 + h / 2
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{cx - side / 2:.0f} {cy - side / 2:.0f} {side:.0f} {side:.0f}" role="img" aria-label="Propertiq">'
           f'<rect x="{cx - side / 2:.0f}" y="{cy - side / 2:.0f}" width="{side:.0f}" height="{side:.0f}" fill="#0b0b0b"/>\n  {body}\n</svg>\n')
    (ROOT / "site/brand" / name).write_text(svg)
    print(name)

write_mark("propertiq-mark.svg")
write_mark("propertiq-mark-maskable.svg", size_pad=0.32)
