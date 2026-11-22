"""Synthesize the music bed, sonic logo and scene sound effects for an episode, then mix with the voice.

Everything is generated here (no samples), so there are no licensing issues.
Reads <work>/voice.wav and <work>/timeline.json (with "moods" and "sfx" written by tools/cues.py),
writes <work>/mix.wav.

Usage: python tools/audio_bed.py out/ep01_vi_work
"""
import json
import os
import sys

import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
rng = np.random.default_rng(3)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tvec(sec):
    return np.arange(int(sec * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


# ---------------------------------------------------------------- music
MOODS = {  # chord voicings (MIDI) cycled every 8 s
    "mystic": [[50, 57, 62, 66, 69, 76], [47, 54, 59, 62, 66, 69], [43, 50, 55, 59, 62, 66], [45, 52, 57, 59, 62, 64]],
    "wonder": [[41, 48, 57, 64, 67, 71], [45, 52, 57, 60, 64, 71], [41, 48, 55, 60, 64, 69], [43, 50, 55, 59, 62, 69]],
    "tense": [[38, 45, 50, 53, 57, 64], [34, 41, 50, 53, 58, 60], [38, 45, 50, 53, 57, 62], [36, 43, 48, 52, 55, 62]],
    "warm": [[43, 50, 55, 59, 62, 66], [48, 55, 59, 64, 67, 74], [40, 47, 55, 59, 62, 66], [50, 57, 62, 66, 69, 71]],
}


def pad(dur, chords, bright=1.0, pulse=0.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    seg = 8.0
    for k in range(int(dur // seg) + 2):
        ch = chords[k % 4]
        a, b = k * seg - 1.5, (k + 1) * seg + 1.5
        i0, i1 = max(0, int(a * SR)), min(n, int(b * SR))
        if i0 >= i1:
            continue
        tt = t[i0:i1]
        env = np.clip((tt - a) / 2.5, 0, 1) * np.clip((b - tt) / 2.5, 0, 1)
        for note in ch:
            f = midi(note)
            for det, amp in ((0, 1.0), (0.1, 0.55), (-0.09, 0.55)):
                ff = f * 2 ** (det / 12)
                ph = rng.uniform(0, 6.28)
                out[i0:i1] += env * amp * (np.sin(2 * np.pi * ff * tt + ph) + 0.22 * bright * np.sin(4 * np.pi * ff * tt + ph)) / (1 + note / 40)
    out += 0.45 * np.sin(2 * np.pi * midi(chords[0][0] - 12) * t)
    if pulse:
        out *= 1 - pulse * (0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * t))
    out *= 0.65 + 0.35 * np.sin(2 * np.pi * 0.07 * t) ** 2
    return out / (np.max(np.abs(out)) + 1e-9)


def bells(dur, density=0.5):
    n = int(dur * SR)
    out = np.zeros(n)
    scale = [74, 76, 78, 81, 83, 86, 88]
    beat, tt = 60 / 72, 4.0
    while tt < dur - 2:
        if rng.random() < density:
            f = midi(scale[rng.integers(len(scale))])
            x = tvec(2.5)
            s = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.01 * x)) * np.exp(-x * 2.2) * 0.35
            i = int(tt * SR)
            out[i:i + len(s)] += s[:max(0, min(len(s), n - i))]
        tt += beat * (1 if rng.random() < 0.6 else 2)
    return out


def music(dur, moods):
    """Crossfade one pad per mood according to the scene mood map."""
    n = int(dur * SR)
    out = np.zeros(n)
    cache = {}
    for m in moods:
        name = m["mood"]
        if name not in cache:
            cache[name] = pad(dur, MOODS[name], bright=1.2 if name in ("wonder", "warm") else 0.8, pulse=0.35 if name == "tense" else 0)
        w = np.zeros(n)
        a, b = int(max(0, m["s"] - 0.8) * SR), int(min(dur, m["e"] + 0.8) * SR)
        ramp = int(1.6 * SR)
        w[a:b] = 1
        cs = np.cumsum(np.concatenate([[0.0], w]))
        sm = (cs[ramp:] - cs[:-ramp]) / ramp
        w = np.concatenate([np.zeros(ramp // 2), sm, np.zeros(n - len(sm) - ramp // 2)])
        out += cache[name] * w
    return out + bells(dur) * 0.45


# ---------------------------------------------------------------- sound effects
def bell(f, length=3.0, decay=1.6):
    x = tvec(length)
    return sum(a * np.sin(2 * np.pi * f * m * x) * np.exp(-x * decay * d) for m, a, d in ((1, 1, 1), (2.0, .4, 1.6), (3.01, .18, 2.4), (5.4, .07, 3.5)))


def sfx_logo():
    """Sonic logo: three rising bell notes (A5, D6, F#6) with shimmer."""
    out = np.zeros(int(3.6 * SR))
    for k, n in enumerate((81, 86, 90)):
        s = bell(midi(n), 3.0) * (0.55 if k < 2 else 0.7)
        i = int(k * 0.2 * SR)
        out[i:i + len(s)] += s
    sh = hp(rng.standard_normal(len(out)), 7000) * np.exp(-tvec(3.6) * 2) * 0.04
    return (out + sh) * 0.5


def sfx_boom():
    x = tvec(1.6)
    f = 75 * np.exp(-x * 1.6) + 30
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 2.2)
    thump = lp(rng.standard_normal(len(x)), 300) * np.exp(-x * 14) * 0.8
    return (s + thump) * 0.9


def sfx_rustle(length=0.9):
    x = tvec(length)
    n = bp(rng.standard_normal(len(x)), 2500, 7000)
    flutter = (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * x + rng.uniform(0, 6)))) * np.sin(np.pi * x / length)
    return n * flutter * 0.35


def sfx_thunder():
    x = tvec(3.2)
    crack = hp(rng.standard_normal(len(x)), 1500) * np.exp(-x * 9) * 0.7
    rumble = lp(rng.standard_normal(len(x)), 140, 4) * 6 * np.exp(-x * 0.9) * (0.6 + 0.4 * np.sin(2 * np.pi * 3 * x) ** 2)
    return (crack + rumble) * 0.6


def sfx_buzz():
    x = tvec(0.75)
    gate = ((x % 0.25) < 0.17).astype(float)
    s = np.sign(np.sin(2 * np.pi * 165 * x)) * 0.5 + np.sin(2 * np.pi * 330 * x) * 0.3
    return lp(s * gate, 1200) * 0.35


def sfx_pop():
    x = tvec(0.14)
    f = 900 + 900 * x / 0.14
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x * 30) * 0.35


def sfx_door():
    x = tvec(0.5)
    click = bp(rng.standard_normal(len(x)), 800, 4000) * np.exp(-x * 60) * 0.6
    thunk = np.sin(2 * np.pi * 90 * x) * np.exp(-x * 18) * 0.5
    return click + thunk


def sfx_hum(length=3.0):
    x = tvec(length)
    env = np.clip(x / 0.4, 0, 1) * np.clip((length - x) / 0.8, 0, 1)
    return (np.sin(2 * np.pi * 100 * x) * 0.5 + np.sin(2 * np.pi * 200 * x) * 0.2 + np.sin(2 * np.pi * 300 * x) * 0.08) * env * 0.25


def sfx_shimmer(length=1.6):
    out = np.zeros(int(length * SR))
    for k in range(14):
        f = midi(rng.integers(88, 100))
        s = np.sin(2 * np.pi * f * tvec(0.6)) * np.exp(-tvec(0.6) * 7) * 0.15
        i = int(rng.uniform(0, length - 0.6) * SR)
        out[i:i + len(s)] += s
    return out


def sfx_scan(length=1.8):
    x = tvec(length)
    f = 300 + 900 * x / length
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 14 * x))
    return s * np.sin(np.pi * x / length) * 0.22


def sfx_clank():
    out = np.zeros(int(2.2 * SR))
    for k in range(6):
        x = tvec(0.8)
        s = sum(a * np.sin(2 * np.pi * f * x) for f, a in ((523 * (1 + k * .07), 1), (1384, .5), (2210, .3), (3170, .15))) * np.exp(-x * 9) * 0.18
        i = int(k * 0.22 * SR)
        out[i:i + len(s)] += s
    return out


def sfx_riser(length=1.5):
    x = tvec(length)
    n = bp(rng.standard_normal(len(x)), 400, 6000) * (x / length) ** 2
    tone = np.sin(2 * np.pi * np.cumsum(200 + 600 * (x / length) ** 2) / SR) * (x / length) ** 2 * 0.3
    return (n * 0.3 + tone) * 0.5


def sfx_whoosh(length=0.9):
    x = tvec(length)
    noise = rng.standard_normal(len(x))
    env = np.sin(np.pi * x / length) ** 2
    bal = x / length
    return (lp(noise, 400) * (1 - bal) * 1.4 + hp(noise, 2500) * bal * 0.5) * env * 0.5


def sfx_ding():
    return bell(1318.5, 2.2, 2.0) * 0.3


SFX = {"logo": sfx_logo, "boom": sfx_boom, "rustle": sfx_rustle, "thunder": sfx_thunder, "buzz": sfx_buzz, "pop": sfx_pop,
       "door": sfx_door, "hum": sfx_hum, "shimmer": sfx_shimmer, "scan": sfx_scan, "clank": sfx_clank, "riser": sfx_riser,
       "whoosh": sfx_whoosh, "ding": sfx_ding}


def add(buf, sig, t, gain=1.0):
    i = int(t * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= len(buf):
        return
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[:j - i] * gain


def main():
    work = sys.argv[1]
    voice, sr = sf.read(os.path.join(work, "voice.wav"))
    assert sr == SR
    if voice.ndim > 1:
        voice = voice.mean(1)
    tl = json.load(open(os.path.join(work, "timeline.json"), encoding="utf-8"))
    dur = len(voice) / SR
    moods = tl.get("moods") or [{"s": 0, "e": dur, "mood": "mystic"}]
    bed = music(dur, moods)
    # duck music under the voice
    env = np.abs(voice)
    win = int(0.25 * SR)
    cs = np.cumsum(np.concatenate([[0.0], env]))
    env = (cs[win:] - cs[:-win]) / win
    env = np.concatenate([np.full(win // 2, env[0]), env, np.full(len(voice) - len(env) - win // 2, env[-1])])
    env /= env.max() + 1e-9
    duck = 1 - 0.55 * np.clip(env * 4, 0, 1)
    idx = np.arange(len(bed))
    fade = np.clip(idx / (0.6 * SR), 0, 1) * np.clip((len(bed) - idx) / (1.5 * SR), 0, 1)
    bed = bed * duck * fade * 0.16
    fx = np.zeros_like(bed)
    for sc in tl["scenes"][1:]:
        add(fx, sfx_whoosh(), sc["s"] - 0.45, 0.22)
    for c in tl.get("sfx", []):
        add(fx, SFX[c["type"]](), c["t"], c.get("gain", 1.0))
    mix = voice + bed + fx
    mix = np.stack([mix, mix], 1)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.89
    sf.write(os.path.join(work, "mix.wav"), mix.astype(np.float32), SR)
    print("mix written", round(dur, 1), "s,", len(tl.get("sfx", [])), "sfx cues")


if __name__ == "__main__":
    main()
