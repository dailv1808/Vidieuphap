"""Series thumbnail template (1080x1920), consistent across every episode.

Layout (all key text sits inside the centered 1080x1080 square, y 420..1500, so grid crops stay readable):
  - thin gold frame around the whole image
  - series wordmark between two gold rules (top)
  - the episode's 3D still: sharp subject in an oval, softly blurred and darkened around it (depth of field)
  - episode badge  "TẬP 02"
  - title in Playfair Display, max 3 lines, auto-fit; words wrapped in *asterisks* are gold
  - subtitle in Montserrat, lotus pink
  - footer tagline

Usage:
  python tools/thumbnail.py <still.png> <out.jpg> --title "CHIẾC XE *BIẾN ĐI ĐÂU?*" --sub "Câu trả lời đúng với cả bạn" --ep 2 [--lang vi]
"""
import argparse
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "tools", "fonts")
W, H = 1080, 1920
GOLD = (243, 199, 115)
GOLD_LIGHT = (255, 231, 176)
WHITE = (255, 255, 255)
LOTUS = (255, 184, 204)
TEXT = {
    "vi": {"series": "BÊN TRONG MỘT Ý NGHĨ", "ep": "TẬP", "tagline": "Vi Diệu Pháp cho người mới"},
    "en": {"series": "INSIDE A THOUGHT", "ep": "EPISODE", "tagline": "Abhidhamma for beginners"},
}


def font(name, size, weight=None):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    if weight:
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
    return f


def spaced(d, xy, text, f, fill, spacing):
    """Draw letter-spaced text centered on x; returns its width."""
    widths = [d.textlength(c, font=f) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2
    for c, w in zip(text, widths):
        d.text((x, xy[1]), c, font=f, fill=fill)
        x += w + spacing
    return total


def background(still, lift=170):
    src = Image.open(still).convert("RGB").resize((W, H))
    # lift the subject so it sits in the upper part of the safe square, above the title
    im = Image.new("RGB", (W, H)); im.paste(src.crop((0, lift, W, H)), (0, 0)); im.paste(src.crop((0, H - lift, W, H)).transpose(Image.FLIP_TOP_BOTTOM), (0, H - lift))
    blur = im.filter(ImageFilter.GaussianBlur(22))
    blur = Image.fromarray((np.asarray(blur).astype(float) * 0.42).astype("uint8"))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse((110, 330, 970, 1110), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(70))
    out = Image.composite(im, blur, mask)
    arr = np.asarray(out).astype(float)
    y = np.linspace(0, 1, H)[:, None, None]
    shade = 1 - 0.55 * np.clip((0.2 - y) / 0.2, 0, 1) - 0.8 * np.exp(-((y - 0.7) / 0.11) ** 2) - 0.6 * np.clip((y - 0.82) / 0.18, 0, 1)
    arr = arr * np.clip(shade, 0.12, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    r = ((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H * 0.45) / (H * 0.6)) ** 2
    arr *= np.clip(1.15 - r * 0.55, 0.35, 1)[..., None]
    arr *= np.array([1.04, 1.0, 0.94])
    return Image.fromarray(np.clip(arr, 0, 255).astype("uint8"))


def parse_title(title):
    words = []
    for part in re.split(r"(\*[^*]+\*)", title):
        if not part.strip():
            continue
        gold = part.startswith("*")
        for w in part.strip("*").split():
            words.append((w, gold))
    return words


def layout_title(d, words, max_w=980, max_lines=2, start=140, min_size=76):
    size = start
    while True:
        f = font("PlayfairDisplay.ttf", size, 900)
        lines, cur = [], []
        for w in words:
            tst = cur + [w]
            if cur and d.textlength(" ".join(x[0] for x in tst), font=f) > max_w:
                lines.append(cur)
                cur = [w]
            else:
                cur = tst
        lines.append(cur)
        fits = all(d.textlength(" ".join(x[0] for x in ln), font=f) <= max_w for ln in lines)
        if (len(lines) <= max_lines and fits) or size <= min_size:
            return f, size, lines
        size -= 6


def draw_title(im, lines, f, top, line_h):
    shadow = Image.new("RGBA", im.size, (0, 0, 0, 0))
    sd, d = ImageDraw.Draw(shadow), ImageDraw.Draw(im)
    for pass_ in ("shadow", "text"):
        y = top
        for ln in lines:
            text = " ".join(x[0] for x in ln)
            x = W / 2 - d.textlength(text, font=f) / 2
            for i, (w, gold) in enumerate(ln):
                piece = w + (" " if i < len(ln) - 1 else "")
                if pass_ == "shadow":
                    sd.text((x, y + 6), piece, font=f, fill=(0, 0, 0, 220))
                else:
                    d.text((x, y), piece, font=f, fill=GOLD_LIGHT if gold else WHITE)
                x += d.textlength(piece, font=f)
            y += line_h
        if pass_ == "shadow":
            shadow = shadow.filter(ImageFilter.GaussianBlur(10))
            im.paste(shadow, (0, 0), shadow)
            d = ImageDraw.Draw(im)
    return y


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("still")
    ap.add_argument("out")
    ap.add_argument("--title", required=True)
    ap.add_argument("--sub", default="")
    ap.add_argument("--ep", type=int, required=True)
    ap.add_argument("--lang", default="vi")
    a = ap.parse_args()
    T = TEXT[a.lang]

    im = background(a.still)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((34, 34, W - 34, H - 34), 46, outline=GOLD, width=2)

    wf = font("Montserrat.ttf", 30, 700)
    tw = spaced(d, (W / 2, 212), T["series"], wf, GOLD, 9)
    d.line((W / 2 - tw / 2 - 90, 232, W / 2 - tw / 2 - 22, 232), fill=GOLD, width=2)
    d.line((W / 2 + tw / 2 + 22, 232, W / 2 + tw / 2 + 90, 232), fill=GOLD, width=2)

    f, size, lines = layout_title(d, parse_title(a.title))
    line_h = int(size * 1.08)
    sub_h = 76 if a.sub else 0
    top = 1500 - line_h * len(lines) - sub_h

    bf = font("Montserrat.ttf", 32, 800)
    label = f"{T['ep']} {a.ep:02d}"
    lw = sum(d.textlength(c, font=bf) for c in label) + 8 * (len(label) - 1)
    by0 = top - 96
    d.rounded_rectangle((W / 2 - lw / 2 - 34, by0, W / 2 + lw / 2 + 34, by0 + 62), 31, fill=(20, 14, 6), outline=GOLD, width=2)
    spaced(d, (W / 2, by0 + 12), label, bf, GOLD_LIGHT, 8)

    y = draw_title(im, lines, f, top, line_h)
    d = ImageDraw.Draw(im)
    if a.sub:
        d.text((W / 2, y + 34), a.sub, font=font("Montserrat.ttf", 46, 600), fill=LOTUS, anchor="mt")
    spaced(d, (W / 2, H - 150), T["tagline"].upper(), font("Montserrat.ttf", 26, 600), (220, 200, 160), 5)

    im.save(a.out, quality=90, optimize=True, progressive=True)


if __name__ == "__main__":
    main()
