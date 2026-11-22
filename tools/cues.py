"""Per-episode sound cues and music moods, anchored to words/sentences in the timeline.

Usage: python tools/cues.py ep01 out/ep01_vi_work [vi|en]
Writes "moods" and "sfx" into <work>/timeline.json for tools/audio_bed.py.

Anchors: ("scene", i, offset) | ("sent", i, j, offset) | ("word", i, {"vi": needle, "en": needle}, nth, offset) | ("end", i, offset)
"""
import json
import os
import re
import sys

EPISODES = {
    "ep01": {  # v3 format (10 scenes, no map): chimes at the key reveals
        "moods": ["mystic"] * 10,
        "sfx": [
            ("ding", ("word", 0, {"vi": "đếm", "en": "count"}, 0, 0.0), 1.0),
            ("ding", ("word", 0, {"vi": "tám", "en": "eighty"}, 0, 0.0), 1.0),
            ("ding", ("word", 3, {"vi": "diệu", "en": "abhidhamma"}, 0, -0.2), 1.0),
            ("ding", ("sent", 5, 1, 0.3), 1.0), ("ding", ("sent", 5, 2, 0.3), 1.0), ("ding", ("sent", 5, 3, 0.3), 1.0),
            ("ding", ("word", 8, {"vi": "bực", "en": "irritation"}, 0, 0.0), 1.0), ("ding", ("word", 8, {"vi": "thèm", "en": "craving"}, 1, 0.0), 1.0),
            ("ding", ("word", 9, {"vi": "tháo", "en": "take"}, 0, 0.0), 1.0), ("ding", ("sent", 9, 3, 0.0), 1.0),
        ],
    },
    "ep02": {
        "moods": ["wonder", "mystic", "wonder", "mystic", "warm", "mystic", "warm", "warm", "mystic"],
        "sfx": [
            ("logo", ("scene", 0, 0.05), 0.9),
            ("scan", ("scene", 0, 0.6), 0.6),
            ("clank", ("sent", 1, 0, 0.0), 0.6),
            ("pop", ("sent", 1, 0, 0.2), 0.7), ("pop", ("sent", 1, 1, 0.2), 0.7), ("pop", ("sent", 1, 2, 0.2), 0.7),
            ("door", ("word", 1, {"vi": "không", "en": "no"}, 0, 0.0), 0.8),
            ("door", ("word", 1, {"vi": "yên", "en": "seat"}, 1, 0.0), 0.8),
            ("door", ("sent", 1, 5, 0.0), 0.8),
            ("clank", ("word", 1, {"vi": "lắp", "en": "put"}, 0, 0.0), 0.9),
            ("boom", ("word", 2, {"vi": "tên", "en": "label"}, 0, 0.1), 0.6), ("ding", ("word", 2, {"vi": "tên", "en": "label"}, 0, 0.1), 0.8),
            ("shimmer", ("word", 2, {"vi": "chính", "en": "you"}, 0, 0.0), 0.8),
            ("pop", ("scene", 3, 0.3), 0.6), ("pop", ("scene", 3, 0.6), 0.6), ("pop", ("scene", 3, 0.9), 0.6),
            ("whoosh", ("word", 3, {"vi": "soi", "en": "closely"}, 0, 0.0), 0.25), ("shimmer", ("word", 3, {"vi": "soi", "en": "closely"}, 0, 0.3), 0.8),
            ("ding", ("word", 3, {"vi": "biết", "en": "knowing"}, 0, 0.0), 0.8),
            ("shimmer", ("word", 4, {"vi": "tóc", "en": "hair"}, 0, 0.0), 0.6),
            ("shimmer", ("word", 4, {"vi": "suy", "en": "thoughts"}, 0, 0.0), 0.6),
            ("shimmer", ("word", 4, {"vi": "cảm", "en": "feelings"}, 0, 0.0), 0.6),
            ("pop", ("sent", 5, 2, 0.0), 0.5), ("pop", ("sent", 5, 3, 0.0), 0.5), ("ding", ("sent", 5, 4, 0.0), 0.7),
            ("clank", ("word", 6, {"vi": "trói", "en": "trapped"}, 0, -0.1), 0.8), ("shimmer", ("word", 6, {"vi": "trói", "en": "trapped"}, 0, 0.2), 0.7),
            ("hum", ("word", 7, {"vi": "đặt", "en": "put"}, 0, 0.0), 0.5),
            ("pop", ("word", 7, {"vi": "cứng", "en": "hard"}, 0, 0.0), 0.7), ("pop", ("word", 7, {"vi": "mát", "en": "cool"}, 0, 0.0), 0.7), ("pop", ("word", 7, {"vi": "nhẵn", "en": "smooth"}, 0, 0.0), 0.7),
            ("pop", ("word", 8, {"vi": "bốn", "en": "four"}, 0, 0.0), 0.6), ("pop", ("word", 8, {"vi": "bốn", "en": "four"}, 0, 0.3), 0.6), ("pop", ("word", 8, {"vi": "bốn", "en": "four"}, 0, 0.6), 0.6), ("pop", ("word", 8, {"vi": "bốn", "en": "four"}, 0, 0.9), 0.6),
            ("ding", ("word", 8, {"vi": "dùng", "en": "using"}, 0, 0.0), 1.0),
            ("logo", ("sent", 8, 3, -0.3), 0.8),
        ],
    },
}


def main():
    ep, work = sys.argv[1], sys.argv[2]
    lang = sys.argv[3] if len(sys.argv) > 3 else "vi"
    path = os.path.join(work, "timeline.json")
    tl = json.load(open(path, encoding="utf-8"))
    sc = tl["scenes"]
    spec = EPISODES[ep]

    def word(i, needle, nth):
        k = 0
        for s in sc[i]["sentences"]:
            for w in s["words"]:
                if re.sub(r"[^\w-]", "", w["w"].lower()).startswith(needle):
                    if k == nth:
                        return w["s"]
                    k += 1
        return None

    def resolve(a):
        kind = a[0]
        if kind == "scene":
            return sc[a[1]]["s"] + a[2]
        if kind == "end":
            return sc[a[1]]["e"] + a[2]
        if kind == "sent":
            s = sc[a[1]]["sentences"]
            return s[min(a[2], len(s) - 1)]["s"] + a[3]
        t = word(a[1], a[2][lang], a[3])
        return None if t is None else t + a[4]

    tl["moods"] = [{"s": s["s"], "e": s["e"], "mood": m} for s, m in zip(sc, spec["moods"])]
    cues = []
    for typ, anchor, gain in spec["sfx"]:
        t = resolve(anchor)
        if t is None:
            print("unresolved cue", typ, anchor)
            continue
        cues.append({"t": round(t, 3), "type": typ, "gain": gain})
    tl["sfx"] = cues
    # v3 audio bed: chimes only at the key reveals
    tl["chimes"] = [c["t"] for c in cues if c["type"] == "ding"]
    json.dump(tl, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(cues), "cues")


if __name__ == "__main__":
    main()
