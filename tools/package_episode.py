"""Name the finished files properly: "Tập 01 - <tên tập>.mp4" (+ thumbnail .jpg), with title metadata.

Usage: python tools/package_episode.py ep01 [vi|en]
Reads out/<ep>_<lang>.mp4 and out/<ep>_<lang>_thumb.jpg, writes into out/export/.
"""
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SERIES = {"vi": "Bên Trong Một Ý Nghĩ", "en": "Inside a Thought"}
PREFIX = {"vi": "Tập", "en": "Episode"}


def main():
    ep, lang = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "vi")
    n = int(re.sub(r"\D", "", ep))
    head = open(os.path.join(ROOT, "scripts", lang, f"{ep}.md"), encoding="utf-8").readline()
    title = head.split("·", 1)[1].strip() if "·" in head else head.lstrip("# ").strip()
    safe = re.sub(r'[\\/:*?"<>|]', "", title)  # Windows-safe file name
    name = f"{PREFIX[lang]} {n:02d} - {safe}"
    out = os.path.join(ROOT, "out", "export")
    os.makedirs(out, exist_ok=True)
    src = os.path.join(ROOT, "out", f"{ep}_{lang}.mp4")
    dst = os.path.join(out, name + ".mp4")
    subprocess.run([os.environ.get("FFMPEG", "ffmpeg"), "-loglevel", "error", "-y", "-i", src, "-c", "copy",
                    "-metadata", f"title={PREFIX[lang]} {n:02d} · {title}", "-metadata", f"album={SERIES[lang]}",
                    "-metadata", f"artist={SERIES[lang]}", "-metadata", f"track={n}", "-movflags", "+faststart", dst], check=True)
    thumb = os.path.join(ROOT, "out", f"{ep}_{lang}_thumb.jpg")
    if os.path.exists(thumb):
        shutil.copyfile(thumb, os.path.join(out, name + ".jpg"))
    print(dst)


if __name__ == "__main__":
    main()
