"""Render one episode script into a vertical video (1080x1920) with burned-in captions, plus a thumbnail.

Usage:
    python tools/render.py scripts/vi/ep01.md --audio <dir with scene_01.wav ...> --out out/ep01_vi
    python tools/render.py scripts/vi/ep01.md --tts          # generate audio first (VieNeu for vi, Kokoro for en)

Images: if <images dir>/scene_XX.png exists it is used as the illustration; otherwise a draft
placeholder card showing the scene's illustration brief is drawn.
"""
import argparse
import os
import re
import subprocess
import sys
import textwrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, "tools", "fonts")
W, H = 1080, 1920
FPS = 30
PAD = 0.45  # silence after each scene, seconds

PALETTE = {  # per episode: (background, accent)
    1: ("#2f3f38", "#e0a54a"), 2: ("#4a3a2c", "#e0a54a"), 3: ("#22384a", "#e0a54a"),
    4: ("#1f3550", "#7cc4f0"), 5: ("#4d3220", "#f2a65a"), 6: ("#2f3f38", "#c9b8f0"),
    7: ("#5a2a1e", "#ff9a5c"), 8: ("#4a1a1e", "#ff7a7a"), 9: ("#33363a", "#c8ccd2"),
    10: ("#1f4152", "#8fd3f0"), 11: ("#4f3a12", "#f5c542"), 12: ("#34304f", "#e8d7a0"),
}
LABELS = {
    "vi": dict(series="SOI TÂM 3 PHÚT", ep="TẬP", draft="ẢNH MINH HỌA · BẢN NHÁP"),
    "en": dict(series="INSIDE A THOUGHT", ep="EP", draft="ILLUSTRATION · DRAFT"),
}
KEYS = {
    "vi": dict(scene="Cảnh", img="Hình", text="Chữ", vo="Lời", terms="Thuật ngữ chuẩn",
               thumb="Thumbnail", main="Chữ chính", sub="Chữ phụ"),
    "en": dict(scene="Scene", img="Visual", text="On-screen", vo="VO", terms="Key terms",
               thumb="Thumbnail", main="Main text", sub="Sub text"),
}


def font(weight, size):
    return ImageFont.truetype(os.path.join(FONTS, f"BeVietnamPro-{weight}.ttf"), size)


def parse(path, lang):
    k = KEYS[lang]
    md = open(path, encoding="utf-8").read()
    title = md.splitlines()[0].lstrip("# ").strip()
    ep = int(re.search(r"(\d+)", title).group(1))
    scenes = []
    for m in re.finditer(rf"^## {k['scene']} \d+ · (.+?)\n(.*?)(?=^## |^---)", md, re.M | re.S):
        body = m.group(2)
        get = lambda key: (re.search(rf"^- \*\*{re.escape(key)}\*\*: (.+)$", body, re.M) or [None, ""])[1].strip()
        scenes.append(dict(name=m.group(1).strip(), img=get(k["img"]), text=get(k["text"]), vo=get(k["vo"])))
    terms_block = md.split(f"## {k['terms']}", 1)[1].split("## ", 1)[0] if f"## {k['terms']}" in md else ""
    thumb = md.split(f"## {k['thumb']}", 1)[1].split("## ", 1)[0]
    tget = lambda key: re.search(rf"\*\*{re.escape(key)}\*\*: (.+)", thumb).group(1).strip()
    keywords = set()
    for row in re.findall(r"^\| ([^|]+?) \|", terms_block, re.M):
        if row.startswith("-") or row.strip() in ("Tiếng Việt", "English", "#", "Nhóm", "Bậc thiền"):
            continue
        for part in re.split(r"[,·/()]| và | and ", row.replace("*", "")):
            part = re.sub(r"\s*\(?\d+\)?$", "", part).strip()
            if len(part) >= 3 and not part.isdigit():
                keywords.add(part)
    return dict(title=title, ep=ep, scenes=scenes, keywords=keywords,
                thumb_main=tget(k["main"]), thumb_sub=tget(k["sub"]))


def wrap_px(draw, text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= max_w:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def background(bg):
    base = Image.new("RGB", (W, H), hex2rgb(bg))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    r, g, b = hex2rgb(bg)
    d.ellipse((-300, 500, W + 300, 1700), fill=(min(r + 40, 255), min(g + 40, 255), min(b + 40, 255)))
    glow = glow.filter(ImageFilter.GaussianBlur(220))
    return Image.blend(base, glow, 0.55)


def scene_card(info, i, lang, images_dir):
    bg, accent = PALETTE.get(info["ep"], PALETTE[1])
    sc = info["scenes"][i]
    L = LABELS[lang]
    im = background(bg)
    d = ImageDraw.Draw(im)
    # header
    d.text((80, 150), f"{L['series']}  ·  {L['ep']} {info['ep']:02d}", font=font("SemiBold", 34), fill=hex2rgb(accent))
    # big on-screen text, upper third
    f_big = font("Bold", 84)
    lines = wrap_px(d, sc["text"].upper() if len(sc["text"]) < 28 else sc["text"], f_big, W - 160)[:3]
    y = 270
    for ln in lines:
        d.text((80, y), ln, font=f_big, fill=(255, 255, 255))
        y += 104
    # illustration area
    box = (80, max(y + 40, 560), W - 80, 1140)
    path = os.path.join(images_dir, f"scene_{i + 1:02d}.png") if images_dir else ""
    if path and os.path.exists(path):
        art = Image.open(path).convert("RGB")
        bw, bh = box[2] - box[0], box[3] - box[1]
        scale = max(bw / art.width, bh / art.height)
        art = art.resize((int(art.width * scale), int(art.height * scale)))
        left, top = (art.width - bw) // 2, (art.height - bh) // 2
        art = art.crop((left, top, left + bw, top + bh))
        mask = Image.new("L", (bw, bh), 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, bw, bh), 36, fill=255)
        im.paste(art, box[:2], mask)
    else:
        r, g, b = hex2rgb(bg)
        d.rounded_rectangle(box, 36, fill=(min(r + 18, 255), min(g + 18, 255), min(b + 18, 255)),
                            outline=hex2rgb(accent), width=3)
        d.text((box[0] + 44, box[1] + 40), L["draft"], font=font("SemiBold", 28), fill=hex2rgb(accent))
        f_desc = font("Medium", 40)
        yy = box[1] + 110
        for ln in wrap_px(d, sc["img"], f_desc, box[2] - box[0] - 88)[:9]:
            d.text((box[0] + 44, yy), ln, font=f_desc, fill=(232, 236, 232))
            yy += 56
    return im


def chunks(text, max_chars=34):
    parts = re.split(r"(?<=[.?!:;])\s+", text)
    out = []
    for p in parts:
        if len(p) <= max_chars * 2:
            out.append(p)
            continue
        sub, cur = re.split(r"(?<=,)\s+", p), ""
        for s in sub:
            if len(cur) + len(s) + 1 <= max_chars * 2:
                cur = (cur + " " + s).strip()
            else:
                if cur:
                    out.append(cur)
                cur = s
        if cur:
            out.append(cur)
    final = []
    for c in out:  # hard split anything still too long
        while len(c) > max_chars * 2:
            cut = c.rfind(" ", 0, max_chars * 2)
            final.append(c[:cut])
            c = c[cut + 1:]
        final.append(c)
    return final


def ass_time(t):
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def highlight(text, keywords, accent):
    r, g, b = hex2rgb(accent)
    col = f"&H00{b:02X}{g:02X}{r:02X}&"
    tokens = sorted(keywords, key=len, reverse=True)
    for kw in tokens:
        text = re.sub(rf"(?<![\w{{]){re.escape(kw)}(?!\w)", lambda m: "{\\c" + col + "}" + m.group(0) + "{\\c&H00FFFFFF&}", text,
                      flags=re.I)
    text = re.sub(r"\b([\wÀ-ỹ]+(?:-[\wÀ-ỹ]+)+)\b",
                  lambda m: "{\\c" + col + "}" + m.group(1) + "{\\c&H00FFFFFF&}", text)
    return text


def build_ass(info, durations, accent, path):
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,Be Vietnam Pro SemiBold,62,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,0,0,0,0,100,100,0,0,1,6,0,2,90,180,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines, t0 = [], 0.0
    for sc, dur in zip(info["scenes"], durations):
        speech = dur - PAD
        cs = chunks(sc["vo"])
        weights = [len(c) + 6 for c in cs]
        tot, t = sum(weights), t0
        for c, wgt in zip(cs, weights):
            span = speech * wgt / tot
            wrapped = "\\N".join(textwrap.wrap(c, 34))
            lines.append(f"Dialogue: 0,{ass_time(t)},{ass_time(t + span)},Cap,,0,0,0,,"
                         f"{highlight(wrapped, info['keywords'], accent)}")
            t += span
        t0 += dur
    open(path, "w", encoding="utf-8").write(head + "\n".join(lines) + "\n")


def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True, check=True).stdout
    return float(out)


def thumbnail(info, lang, path, images_dir):
    bg, accent = PALETTE.get(info["ep"], PALETTE[1])
    L = LABELS[lang]
    im = background(bg)
    d = ImageDraw.Draw(im)
    art = os.path.join(images_dir, "thumb.png") if images_dir else ""
    if art and os.path.exists(art):
        a = Image.open(art).convert("RGB").resize((W, H))
        im = Image.blend(im, a, 0.85)
        d = ImageDraw.Draw(im)
    d.text((80, 300), L["series"], font=font("SemiBold", 40), fill=hex2rgb(accent))
    d.rounded_rectangle((W - 300, 285, W - 80, 355), 35, fill=hex2rgb(accent))
    d.text((W - 190, 320), f"{L['ep']} {info['ep']:02d}", font=font("Bold", 36), fill=hex2rgb(bg), anchor="mm")
    f = font("Bold", 132)
    lines = wrap_px(d, info["thumb_main"], f, W - 160)
    while len(lines) > 4:
        f = font("Bold", f.size - 10)
        lines = wrap_px(d, info["thumb_main"], f, W - 160)
    y = 960 - len(lines) * f.size * 0.6
    for ln in lines:
        d.text((W // 2, y), ln, font=f, fill=(255, 255, 255), anchor="mt", stroke_width=6, stroke_fill=(0, 0, 0))
        y += f.size * 1.15
    d.text((W // 2, y + 40), info["thumb_sub"], font=font("Medium", 44), fill=hex2rgb(accent), anchor="mt")
    im.save(path, quality=92)


def tts(info, lang, audio_dir):
    os.makedirs(audio_dir, exist_ok=True)
    if lang == "vi":
        from vieneu import Vieneu
        engine = Vieneu()
        for i, sc in enumerate(info["scenes"], 1):
            engine.save(engine.infer(sc["vo"], voice="Thiền Tâm Đức"), os.path.join(audio_dir, f"scene_{i:02d}.wav"))
    else:
        import soundfile as sf
        from kokoro_onnx import Kokoro
        kdir = os.environ["KOKORO_DIR"]
        engine = Kokoro(os.path.join(kdir, "kokoro-v1.0.onnx"), os.path.join(kdir, "voices-v1.0.bin"))
        voice = os.environ.get("KOKORO_VOICE", "am_michael")
        for i, sc in enumerate(info["scenes"], 1):
            s, sr = engine.create(sc["vo"], voice=voice, speed=0.95, lang="en-us" if voice[0] == "a" else "en-gb")
            sf.write(os.path.join(audio_dir, f"scene_{i:02d}.wav"), s, sr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("script")
    ap.add_argument("--audio", help="directory with scene_XX.wav")
    ap.add_argument("--images", help="directory with scene_XX.png and thumb.png (optional)")
    ap.add_argument("--out", required=True, help="output prefix, e.g. out/ep01_vi")
    ap.add_argument("--tts", action="store_true", help="generate audio into --audio first")
    a = ap.parse_args()
    lang = "en" if "/en/" in a.script.replace("\\", "/") else "vi"
    info = parse(a.script, lang)
    work = a.out + "_work"
    os.makedirs(work, exist_ok=True)
    audio_dir = a.audio or os.path.join(work, "audio")
    if a.tts:
        tts(info, lang, audio_dir)
    _, accent = PALETTE.get(info["ep"], PALETTE[1])

    durations, clips, wavs = [], [], []
    for i in range(len(info["scenes"])):
        wav = os.path.join(audio_dir, f"scene_{i + 1:02d}.wav")
        dur = duration(wav) + PAD
        durations.append(dur)
        png = os.path.join(work, f"card_{i + 1:02d}.png")
        scene_card(info, i, lang, a.images).save(png)
        clip = os.path.join(work, f"clip_{i + 1:02d}.mp4")
        frames = int(round(dur * FPS))
        zoom = f"zoompan=z='1+0.035*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={W}x{H}:fps={FPS}"
        run(["ffmpeg", "-y", "-loop", "1", "-i", png, "-vf", f"scale={W * 2}:{H * 2},{zoom},format=yuv420p",
             "-frames:v", str(frames), "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", clip])
        clips.append(clip)
        padded = os.path.join(work, f"audio_{i + 1:02d}.wav")
        run(["ffmpeg", "-y", "-i", wav, "-af", f"apad=pad_dur={PAD}", "-ar", "48000", "-ac", "1", padded])
        wavs.append(padded)

    listf = os.path.join(work, "clips.txt")
    open(listf, "w").write("".join(f"file '{os.path.abspath(c)}'\n" for c in clips))
    alist = os.path.join(work, "audio.txt")
    open(alist, "w").write("".join(f"file '{os.path.abspath(w)}'\n" for w in wavs))
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", listf, "-c", "copy", os.path.join(work, "video.mp4")])
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", alist, "-c:a", "pcm_s16le", os.path.join(work, "voice.wav")])
    ass = os.path.join(work, "captions.ass")
    build_ass(info, durations, accent, ass)
    srt_free = ass.replace("\\", "/").replace(":", "\\:")
    run(["ffmpeg", "-y", "-i", os.path.join(work, "video.mp4"), "-i", os.path.join(work, "voice.wav"),
         "-vf", f"ass={srt_free}:fontsdir={FONTS}", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
         a.out + ".mp4"])
    thumbnail(info, lang, a.out + "_thumb.jpg", a.images)
    print(f"{a.out}.mp4  {sum(durations):.1f}s")


if __name__ == "__main__":
    sys.exit(main())
