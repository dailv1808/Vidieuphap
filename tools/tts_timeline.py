"""Generate voiceover sentence by sentence and write a word-level timeline for the motion renderer.

Usage (inside a venv with `vieneu`, `numpy`, `soundfile`):
    python tools/tts_timeline.py scripts/vi/ep01.md out/ep01_vi_work

Writes <work>/voice.wav and <work>/timeline.json.
"""
import json
import os
import re
import sys

import numpy as np
import soundfile as sf

SR = 48000
SENT_GAP = 0.32   # pause between sentences inside a scene (s)
SCENE_GAP = 0.95  # pause between scenes (s)
VOICE = os.environ.get("VOICE", "Thiền Tâm Đức")
CACHE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "tts_cache")


def parse(path):
    md = open(path, encoding="utf-8").read()
    scenes = []
    en = "/en/" in path.replace("\\", "/")
    head, k_text, k_vo = ("Scene", "On-screen", "VO") if en else ("Cảnh", "Chữ", "Lời")
    for m in re.finditer(rf"^## {head} (\d+) · (.+?)\n(.*?)(?=^## |^---)", md, re.M | re.S):
        body = m.group(3)
        get = lambda k: (re.search(rf"^- \*\*{k}\*\*: (.+)$", body, re.M) or [None, ""])[1].strip()
        scenes.append(dict(id=int(m.group(1)), name=m.group(2).strip(), text=get(k_text), vo=get(k_vo)))
    return scenes


def sentences(vo):
    return [s for s in re.split(r"(?<=[.?!])\s+", vo.strip()) if s]


def speech_span(wav, thr=0.02):
    env = np.abs(wav)
    idx = np.where(env > thr * env.max())[0]
    if len(idx) == 0:
        return 0, len(wav)
    return idx[0], idx[-1]


def main():
    src, work = sys.argv[1], sys.argv[2]
    os.makedirs(work, exist_ok=True)
    import hashlib
    en = "/en/" in src.replace("\\", "/")
    os.makedirs(CACHE, exist_ok=True)
    engine = {}

    def synth(text):
        key = hashlib.sha1(f"{'en' if en else 'vi'}|{VOICE}|{text}".encode()).hexdigest()[:16]
        f = os.path.join(CACHE, key + ".wav")
        if os.path.exists(f):
            a, _ = sf.read(f, dtype="float32")
            return a
        if en:
            if "k" not in engine:
                from kokoro_onnx import Kokoro
                kd = os.environ["KOKORO_DIR"]
                engine["k"] = Kokoro(os.path.join(kd, "kokoro-v1.0.onnx"), os.path.join(kd, "voices-v1.0.bin"))
            v = os.environ.get("EN_VOICE", "am_michael")
            a, sr = engine["k"].create(text, voice=v, speed=0.95, lang="en-us" if v[0] == "a" else "en-gb")
        else:
            if "v" not in engine:
                from vieneu import Vieneu
                engine["v"] = Vieneu()
            a, sr = engine["v"].infer(text, voice=VOICE), 48000
        a = np.asarray(a, dtype=np.float32).flatten()
        if sr != SR:
            import soxr
            a = soxr.resample(a, sr, SR)
        sf.write(f, a, SR)
        return a

    scenes = parse(src)
    out, t = [], 0.0
    for sc in scenes:
        sc_start = t
        sents = []
        for s in sentences(sc["vo"]):
            audio = synth(s)
            a, b = speech_span(audio)
            audio = audio[max(0, a - int(0.03 * SR)): b + int(0.08 * SR)]
            dur = len(audio) / SR
            words = s.split()
            weights = [len(re.sub(r"[^\wÀ-ỹ]", "", w)) + 2 for w in words]
            tot, wt = sum(weights), t
            wlist = []
            for w, g in zip(words, weights):
                span = (dur - 0.08) * g / tot
                wlist.append(dict(w=w, s=round(wt, 3), e=round(wt + span, 3)))
                wt += span
            sents.append(dict(text=s, s=round(t, 3), e=round(t + dur, 3), words=wlist, audio=audio))
            t += dur + SENT_GAP
            print(f"scene {sc['id']}: {dur:5.2f}s  {s[:50]}", flush=True)
        t += SCENE_GAP - SENT_GAP
        out.append(dict(id=sc["id"], name=sc["name"], text=sc["text"], s=round(sc_start, 3), e=round(t, 3),
                        sentences=sents))
    total = t + 0.6
    voice = np.zeros(int(total * SR), dtype=np.float32)
    for sc in out:
        for s in sc["sentences"]:
            i = int(s["s"] * SR)
            voice[i:i + len(s["audio"])] += s.pop("audio")
    sf.write(os.path.join(work, "voice.wav"), voice, SR)
    json.dump(dict(duration=round(total, 3), scenes=out), open(os.path.join(work, "timeline.json"), "w",
                                                                  encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"total {total:.1f}s")


if __name__ == "__main__":
    main()
