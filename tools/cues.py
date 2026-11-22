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
    "ep01": {
        # mood per scene: mystic | wonder | tense | warm
        "moods": ["wonder", "tense", "mystic", "wonder", "mystic", "wonder", "mystic", "warm", "warm", "wonder", "mystic"],
        "sfx": [
            ("logo", ("scene", 0, 0.05), 0.9),
            ("rustle", ("scene", 0, 1.0), 0.8),
            ("boom", ("word", 0, {"vi": "đếm", "en": "count"}, 0, -0.05), 0.9),
            ("shimmer", ("word", 0, {"vi": "đếm", "en": "count"}, 0, 0.1), 0.8),
            ("ding", ("word", 0, {"vi": "tám", "en": "eighty"}, 0, 0.0), 1.0),
            ("thunder", ("sent", 1, 1, 0.2), 0.9),
            ("buzz", ("sent", 1, 2, 0.3), 0.9),
            ("pop", ("sent", 1, 2, 0.55), 0.8), ("pop", ("sent", 1, 2, 1.0), 0.7), ("pop", ("sent", 1, 2, 1.45), 0.7),
            ("door", ("sent", 1, 3, 0.25), 1.0), ("hum", ("sent", 1, 3, 0.4), 0.9),
            ("shimmer", ("sent", 2, 2, 0.0), 0.7),
            ("riser", ("scene", 3, 0.0), 0.7), ("boom", ("scene", 3, 2.55), 0.6),
            ("ding", ("word", 3, {"vi": "diệu", "en": "abhidhamma"}, 0, -0.2), 0.9),
            ("pop", ("word", 3, {"vi": "miến", "en": "myanmar"}, 0, 0), 0.6), ("pop", ("word", 3, {"vi": "thái", "en": "thailand"}, 0, 0), 0.6), ("pop", ("word", 3, {"vi": "việt", "en": "vietnam"}, 0, 0), 0.6),
            ("whoosh", ("sent", 4, 2, 0.0), 0.15),
            ("whoosh", ("sent", 4, 3, 0.0), 0.15),
            ("shimmer", ("word", 4, {"vi": "x-quang", "en": "x-ray"}, 0, -0.2), 0.7),
            ("scan", ("word", 4, {"vi": "chụp", "en": "scans"}, 0, 0.0), 1.0),
            ("ding", ("word", 4, {"vi": "giận", "en": "anger"}, 1, 0.0), 0.8),
            ("ding", ("sent", 5, 1, 0.3), 0.8), ("ding", ("sent", 5, 2, 0.3), 0.8), ("ding", ("sent", 5, 3, 0.3), 0.9),
            ("pop", ("sent", 6, 2, 0.0), 0.5), ("pop", ("sent", 6, 3, 0.0), 0.5), ("ding", ("sent", 6, 4, 0.0), 0.7),
            ("rustle", ("sent", 7, 1, 0.0), 0.9), ("shimmer", ("sent", 7, 1, 0.3), 0.8), ("shimmer", ("sent", 7, 2, 0.0), 0.9),
            ("pop", ("word", 8, {"vi": "bực", "en": "irritation"}, 0, 0.1), 0.8), ("pop", ("word", 8, {"vi": "thèm", "en": "craving"}, 1, 0.1), 0.8),
            ("pop", ("sent", 8, 4, 0.6), 0.6), ("pop", ("sent", 8, 4, 0.95), 0.6), ("pop", ("sent", 8, 4, 1.3), 0.6),
            ("riser", ("scene", 9, -0.2), 0.5), ("boom", ("scene", 9, 1.5), 0.5), ("shimmer", ("scene", 9, 1.6), 0.9),
            ("clank", ("word", 10, {"vi": "tháo", "en": "take"}, 0, 0.0), 0.9),
            ("shimmer", ("sent", 10, 2, 0.0), 0.9),
            ("logo", ("sent", 10, 3, -0.3), 0.8),
            ("shimmer", ("end", 10, -1.5), 0.8),
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
    tl.pop("chimes", None)
    json.dump(tl, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(len(cues), "cues")


if __name__ == "__main__":
    main()
