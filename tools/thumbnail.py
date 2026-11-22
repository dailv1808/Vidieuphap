"""Compose a 1080x1920 thumbnail from a clean 3D still.

Usage: python tools/thumbnail.py <still.png> <out.jpg> --big 89 --main "LOẠI TÂM" --sub "Bạn đang ở loại nào?" --ep "TẬP 01"
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "tools", "fonts")
SERIES = "BÊN TRONG MỘT Ý NGHĨ"


def font(name, size, weight):
    f = ImageFont.truetype(os.path.join(FONTS, name), size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("still"); ap.add_argument("out")
    ap.add_argument("--big", default=""); ap.add_argument("--main", required=True)
    ap.add_argument("--sub", default=""); ap.add_argument("--ep", default="TẬP 01")
    a = ap.parse_args()
    im = Image.open(a.still).convert("RGB").resize((1080, 1920))
    shade = Image.new("L", im.size, 0)
    d = ImageDraw.Draw(shade)
    for y in range(1920):
        d.line([(0, y), (1080, y)], fill=int(165 * max(0, 1 - abs(y - 1100) / 560)))
    im = Image.composite(Image.new("RGB", im.size, (4, 7, 15)), im, shade)
    title_big = font("PlayfairDisplay.ttf", 360, 900)
    title = font("PlayfairDisplay.ttf", 132, 800)
    ui = font("Montserrat.ttf", 36, 700)
    sub = font("Montserrat.ttf", 58, 800)
    if a.big:
        glow = Image.new("RGB", im.size, (0, 0, 0))
        ImageDraw.Draw(glow).text((540, 760), a.big, font=title_big, fill=(245, 165, 55), anchor="mt")
        glow = glow.filter(ImageFilter.GaussianBlur(45))
        im = Image.fromarray(np.clip(np.asarray(im).astype(int) + np.asarray(glow).astype(int), 0, 255).astype("uint8"))
    d = ImageDraw.Draw(im)
    d.text((72, 300), SERIES, font=ui, fill=(243, 210, 140))
    d.rounded_rectangle((820, 286, 1008, 346), 30, outline=(243, 210, 140), width=2)
    d.text((914, 316), a.ep, font=font("Montserrat.ttf", 30, 700), fill=(243, 210, 140), anchor="mm")
    y = 760
    if a.big:
        d.text((540, y), a.big, font=title_big, fill=(255, 233, 180), anchor="mt", stroke_width=3, stroke_fill=(70, 35, 0))
        y += 380
    # wrap the main text to the frame width (960 px), shrinking the font until it fits in 3 lines
    size = title.size
    while True:
        f = font("PlayfairDisplay.ttf", size, 800)
        words, lines, cur = a.main.split(), [], ""
        for w in words:
            tst = (cur + " " + w).strip()
            if d.textlength(tst, font=f) <= 960 or not cur:
                cur = tst
            else:
                lines.append(cur); cur = w
        lines.append(cur)
        if (len(lines) <= 3 and all(d.textlength(l, font=f) <= 960 for l in lines)) or size <= 60:
            break
        size -= 8
    for ln in lines:
        d.text((540, y), ln, font=f, fill=(255, 255, 255), anchor="mt", stroke_width=5, stroke_fill=(0, 0, 0))
        y += int(size * 1.12)
    if a.sub:
        d.text((540, y + 30), a.sub, font=sub, fill=(255, 190, 208), anchor="mt", stroke_width=4, stroke_fill=(0, 0, 0))
    im.save(a.out, quality=92)


if __name__ == "__main__":
    main()
