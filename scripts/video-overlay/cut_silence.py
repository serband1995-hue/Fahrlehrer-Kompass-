#!/usr/bin/env python3
"""Schneidet lange Pausen und Füllwörter (ähm, äh) aus einem Video. Erzeugt außerdem words_cut.json mit
neu berechneten Zeiten, damit Einblendungen und Untertitel danach wieder passen.

Aufruf:  python3 cut_silence.py video.mp4 --words words.json --out geschnitten.mp4 [--max-pause 0.45] [--keep 0.2]
Hinweis: Das Original bleibt unverändert. Erst Text prüfen, dann schneiden, dann captions/render mit words_cut.json.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

FUELLER = {"ähm", "äh", "ehm", "öhm", "öh", "hm", "hmm", "mhm", "ähem"}


def sauber(w):
    return w.lower().strip(".,!?;:…-–\"'")


def dauer(pfad):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", pfad],
                       capture_output=True, text=True, check=True)
    return float(r.stdout.strip())


def entfernen(woerter, gesamt, max_pause, keep, pad, anfang, ende, fueller):
    rm = []
    echte = [w for w in woerter if sauber(w["w"]) not in fueller]
    for w in woerter:
        if sauber(w["w"]) in fueller:
            rm.append([max(w["s"] - 0.03, 0), w["e"] + 0.03])
    if echte:
        if echte[0]["s"] - anfang > 0.1:
            rm.append([0, echte[0]["s"] - anfang])
        if gesamt - (echte[-1]["e"] + ende) > 0.1:
            rm.append([echte[-1]["e"] + ende, gesamt])
        for a, b in zip(echte, echte[1:]):
            if b["s"] - a["e"] > max_pause:
                rm.append([a["e"] + keep / 2 + pad, b["s"] - keep / 2 - pad])
    rm = sorted(r for r in rm if r[1] - r[0] > 0.08)
    ver = []
    for a, b in rm:
        if ver and a <= ver[-1][1]:
            ver[-1][1] = max(ver[-1][1], b)
        else:
            ver.append([a, b])
    return ver


def behalten(ver, gesamt):
    k, pos = [], 0.0
    for a, b in ver:
        if a - pos > 0.04:
            k.append((pos, a))
        pos = b
    if gesamt - pos > 0.04:
        k.append((pos, gesamt))
    return k


def neu(t, ver):
    return t - sum(min(b, t) - a for a, b in ver if a < t)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--words", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-pause", type=float, default=0.45, help="längere Pausen werden gekürzt (Sekunden)")
    ap.add_argument("--keep", type=float, default=0.2, help="so viel Pause bleibt stehen")
    ap.add_argument("--pad", type=float, default=0.05)
    ap.add_argument("--lead", type=float, default=0.15, help="Pause vor dem ersten Wort")
    ap.add_argument("--tail", type=float, default=0.35, help="Pause nach dem letzten Wort")
    ap.add_argument("--fillers", default=",".join(sorted(FUELLER)), help="Füllwörter, mit Komma; leer = keine entfernen")
    a = ap.parse_args()

    gesamt = dauer(a.video)
    daten = json.load(open(a.words, encoding="utf-8"))
    fueller = {f.strip() for f in a.fillers.split(",") if f.strip()}
    ver = entfernen(daten["words"], gesamt, a.max_pause, a.keep, a.pad, a.lead, a.tail, fueller)
    keep = behalten(ver, gesamt)
    if not keep:
        sys.exit("FEHLER: nichts zu behalten (Wörter-Datei leer?)")

    teile, v, au = [], [], []
    for i, (s, e) in enumerate(keep):
        d = e - s
        f = min(0.015, d / 3)
        teile.append(f"[0:v]trim=start={s:.3f}:end={e:.3f},setpts=PTS-STARTPTS[v{i}]")
        teile.append(f"[0:a]atrim=start={s:.3f}:end={e:.3f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:d={f:.3f},afade=t=out:st={d - f:.3f}:d={f:.3f}[a{i}]")
        v.append(f"[v{i}][a{i}]")
    teile.append("".join(v) + f"concat=n={len(keep)}:v=1:a=1[vo][ao]")
    skript = tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False, encoding="utf-8")
    skript.write(";\n".join(teile))
    skript.close()
    r = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.video,
                        "-filter_complex_script", skript.name, "-map", "[vo]", "-map", "[ao]",
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
                        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", a.out],
                       capture_output=True, text=True)
    os.unlink(skript.name)
    if r.returncode:
        sys.exit("ffmpeg-Fehler:\n" + r.stderr[-1500:])

    neue = []
    for w in daten["words"]:
        if sauber(w["w"]) in fueller:
            continue
        neue.append({"w": w["w"], "s": round(neu(w["s"], ver), 2), "e": round(neu(w["e"], ver), 2)})
    ziel = os.path.splitext(a.out)[0] + ".words_cut.json"
    nd = dauer(a.out)
    json.dump({"duration": round(nd, 2), "words": neue}, open(ziel, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{gesamt:.1f}s -> {nd:.1f}s ({gesamt - nd:.1f}s gespart, {len(ver)} Schnitte, {len(daten['words']) - len(neue)} Füllwörter)")
    print("Zeiten für Einblendungen und Untertitel:", ziel)


if __name__ == "__main__":
    main()
