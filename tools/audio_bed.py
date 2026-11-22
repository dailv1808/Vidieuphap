"""Synthesize an original ambient music bed + transition SFX for an episode, then mix with the voice.

Everything is generated here (no samples), so there are no licensing issues.
Usage: python tools/audio_bed.py out/ep01_vi_work   (reads voice.wav + timeline.json, writes mix.wav)
"""
import json
import os
import sys

import numpy as np
import soundfile as sf

SR = 48000
rng = np.random.default_rng(3)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def onepole(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(0, len(x), 4096):  # vectorized per block via lfilter-like recursion
        blk = x[i:i + 4096]
        out = np.empty_like(blk)
        for j, v in enumerate(blk):
            acc = (1 - a) * v + a * acc
            out[j] = acc
        y[i:i + 4096] = out
    return y


def pad(dur):
    """Slow chord pad: Dmaj9 - Bm7 - Gmaj7 - A6sus, 8 s per chord, soft detuned partials."""
    chords = [[50, 57, 62, 66, 69, 76], [47, 54, 59, 62, 66, 69], [43, 50, 55, 59, 62, 66], [45, 52, 57, 59, 62, 64]]
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
            for det, amp in ((0, 1.0), (0.12, 0.6), (-0.1, 0.6)):
                ff = f * 2 ** (det / 12)
                ph = rng.uniform(0, 6.28)
                out[i0:i1] += env * amp * (np.sin(2 * np.pi * ff * tt + ph) + 0.25 * np.sin(4 * np.pi * ff * tt + ph)) / (1 + note / 40)
    out += 0.5 * np.sin(2 * np.pi * midi(38) * t) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t))
    out *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.08 * t) ** 2
    return out / np.max(np.abs(out))


def bells(dur):
    """Sparse pentatonic plucks at 72 bpm, soft and high."""
    n = int(dur * SR)
    out = np.zeros(n)
    scale = [74, 76, 78, 81, 83, 86, 88]
    beat = 60 / 72
    k = 0
    tt = 4.0
    while tt < dur - 2:
        if rng.random() < 0.55:
            note = scale[rng.integers(len(scale))]
            f = midi(note)
            ln = int(2.5 * SR)
            x = np.arange(ln) / SR
            s = (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(2 * np.pi * f * 2.01 * x)) * np.exp(-x * 2.2) * 0.35
            i = int(tt * SR)
            out[i:i + ln] += s[:max(0, min(ln, n - i))]
        tt += beat * (1 if rng.random() < 0.6 else 2)
        k += 1
    return out


def whoosh(length=0.9):
    ln = int(length * SR)
    x = np.arange(ln) / SR
    noise = rng.standard_normal(ln)
    env = np.sin(np.pi * x / length) ** 2
    # rising band: mix of two one-pole lowpassed noises with moving balance
    lo = onepole(noise, 400)
    hi = noise - onepole(noise, 2500)
    bal = x / length
    return (lo * (1 - bal) * 1.4 + hi * bal * 0.5) * env * 0.5


def chime(f=1318.5, length=2.2):
    x = np.arange(int(length * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * m * x) * np.exp(-x * d) for m, a, d in ((1, 1, 2.0), (2.76, .35, 4), (5.4, .15, 6)))
    return s * 0.3


def add(buf, sig, t, gain=1.0):
    i = int(t * SR)
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
    music = pad(dur) * 0.9 + bells(dur) * 0.5
    # duck under voice
    env = np.abs(voice)
    win = int(0.25 * SR)
    cs = np.cumsum(np.concatenate([[0.0], env]))
    env = (cs[win:] - cs[:-win]) / win
    env = np.concatenate([np.full(win // 2, env[0]), env, np.full(len(voice) - len(env) - win // 2, env[-1])])
    env = env / (env.max() + 1e-9)
    duck = 1 - 0.55 * np.clip(env * 4, 0, 1)
    fade = np.clip(np.arange(len(music)) / (1.5 * SR), 0, 1) * np.clip((len(music) - np.arange(len(music))) / (2.5 * SR), 0, 1)
    music = music * duck * fade * 0.16
    sfx = np.zeros_like(music)
    for sc in tl["scenes"][1:]:
        add(sfx, whoosh(), sc["s"] - 0.45, 0.22)
    # chimes on key reveals: words listed per episode in timeline extras, fallback to first sentence of each scene
    keys = tl.get("chimes") or []
    for t in keys:
        add(sfx, chime(), t, 0.25)
    mix = voice * 1.0 + music + sfx
    mix = np.stack([mix, mix], 1)
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.89
    sf.write(os.path.join(work, "mix.wav"), mix.astype(np.float32), SR)
    print("mix written", round(dur, 1), "s")


if __name__ == "__main__":
    main()
