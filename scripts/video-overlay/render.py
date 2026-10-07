#!/usr/bin/env python3
"""Rendert ein Hochformat-Video (1080x1920) mit großen Wort-Einblendungen und eingeblendeten Bildern oder Clips.
Der Sprecher bleibt im Vordergrund: Bilder erscheinen standardmäßig als kleine Karte oben, nur kurz.

Aufruf:
  python3 render.py video.mp4 --words words.json --out fertig.mp4 [--broll plan.json]

plan.json:
  {"emphasis": ["Alkohol", "0,0"],
   "items": [{"start": 3.2, "end": 5.4, "file": "assets/auge.jpg", "mode": "card"},
             {"start": 9.0, "end": 10.5, "file": "assets/szene.mp4", "mode": "full"}]}
mode "card" = Karte oben, Sprecher bleibt sichtbar (Standard). mode "full" = Zwischenschnitt über das ganze Bild, Ton läuft weiter.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import captions  # noqa: E402

W, H, FPS = 1080, 1920, 30
# Kino-Look nur auf das Sprecher-Bild: etwas mehr Kontrast, dunkelgrüne Schatten, goldene Lichter, Vignette, feines Korn.
LOOK = {
    "cinematic": "eq=contrast=1.10:saturation=0.92:gamma=0.96,"
                 "colorbalance=gs=0.05:bs=0.02:rm=0.02:rh=0.06:gh=0.03:bh=-0.05,"
                 "vignette=angle=PI/4.5,noise=alls=6:allf=t",
}
BILD = {".jpg", ".jpeg", ".png", ".webp"}
MAX_KARTE = 3.5     # Sekunden: länger lenkt vom Sprecher ab
MAX_VOLL = 2.5


def ffprobe(pfad, feld):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", feld, "-of", "default=nw=1:nk=1", pfad],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def maske(pfad, w, h, radius):
    from PIL import Image, ImageDraw
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    m.save(pfad)


def pruefe(items, dauer, basis):
    fehler, warn = [], []
    letzte = 0
    for i, it in enumerate(sorted(items, key=lambda x: x["start"]), 1):
        s, e = it["start"], it["end"]
        datei = it["file"] if os.path.isabs(it["file"]) else os.path.join(basis, it["file"])
        it["_pfad"] = datei
        if not os.path.isfile(datei):
            fehler.append(f"Einblendung {i}: Datei fehlt: {it['file']}")
        if e <= s:
            fehler.append(f"Einblendung {i}: Ende vor Start")
        if e > dauer + 0.05:
            fehler.append(f"Einblendung {i}: Ende {e}s liegt nach dem Videoende ({dauer:.1f}s)")
        if s < letzte:
            fehler.append(f"Einblendung {i}: überlappt die vorherige")
        limit = MAX_VOLL if it.get("mode") == "full" else MAX_KARTE
        if e - s > limit:
            warn.append(f"Einblendung {i}: {e - s:.1f}s ist lang (empfohlen höchstens {limit}s)")
        letzte = e
    return fehler, warn


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--words", required=True)
    ap.add_argument("--broll")
    ap.add_argument("--out", required=True)
    ap.add_argument("--emphasis", default="", help="Wörter in Gold, mit Komma getrennt (zusätzlich zum Plan)")
    ap.add_argument("--caption-y", type=int, default=1380, help="untere Kante der Einblendung in Pixel (von oben)")
    ap.add_argument("--card-y", type=int, default=80)
    ap.add_argument("--card-w", type=int, default=800)
    ap.add_argument("--card-h", type=int, default=400)
    ap.add_argument("--upper", action="store_true", help="Wörter in Großbuchstaben")
    ap.add_argument("--loudnorm", action="store_true", help="Lautstärke angleichen")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--look", choices=sorted(LOOK), help="Farbstimmung des Sprecher-Bildes")
    a = ap.parse_args()

    dauer = float(ffprobe(a.video, "format=duration"))
    plan = json.load(open(a.broll, encoding="utf-8")) if a.broll else {"items": []}
    items = sorted(plan.get("items", []), key=lambda x: x["start"])
    fehler, warn = pruefe(items, dauer, os.path.dirname(os.path.abspath(a.broll)) if a.broll else ".")
    for w in warn:
        print("HINWEIS:", w)
    if fehler:
        sys.exit("FEHLER:\n  " + "\n  ".join(fehler))

    tmp = tempfile.mkdtemp(prefix="overlay_")
    woerter = json.load(open(a.words, encoding="utf-8"))["words"]
    hv = list(plan.get("emphasis", [])) + a.emphasis.split(",")
    ass = os.path.join(tmp, "captions.ass")
    open(ass, "w", encoding="utf-8").write(captions.erzeuge(woerter, hv, y=a.caption_y, gross=a.upper))

    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.video]
    teile = [f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1" + (("," + LOOK[a.look]) if a.look else "") + "[b0]"]
    maske_karte = os.path.join(tmp, "karte.png")
    if any(it.get("mode", "card") == "card" for it in items):
        maske(maske_karte, a.card_w, a.card_h, 36)

    idx = 1
    aktuell = "b0"
    for i, it in enumerate(items):
        s, e = it["start"], it["end"]
        voll = it.get("mode", "card") == "full"
        bw, bh = (W, H) if voll else (a.card_w, a.card_h)
        ext = os.path.splitext(it["_pfad"])[1].lower()
        if ext in BILD:
            cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{e - s:.2f}", "-i", it["_pfad"]]
        else:
            cmd += ["-t", f"{e - s:.2f}", "-i", it["_pfad"]]
        inp = idx
        idx += 1
        kette = (f"[{inp}:v]scale={bw}:{bh}:force_original_aspect_ratio=increase,crop={bw}:{bh},fps={FPS},"
                 f"setsar=1,format=yuva420p")
        if not voll:
            cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{e - s:.2f}", "-i", maske_karte]
            m = idx
            idx += 1
            teile.append(f"[{m}:v]format=gray[m{i}]")
            teile.append(f"{kette}[c{i}];[c{i}][m{i}]alphamerge[a{i}]")
        else:
            teile.append(f"{kette}[a{i}]")
        d = min(0.25, (e - s) / 3)
        teile.append(f"[a{i}]setpts=PTS-STARTPTS+{s}/TB,fade=t=in:st={s}:d={d}:alpha=1,"
                     f"fade=t=out:st={e - d}:d={d}:alpha=1[f{i}]")
        x = "0" if voll else f"(W-w)/2"
        y = "0" if voll else str(a.card_y)
        teile.append(f"[{aktuell}][f{i}]overlay=x={x}:y={y}:enable='between(t,{s},{e})':eof_action=pass[b{i + 1}]")
        aktuell = f"b{i + 1}"

    if a.no_captions:
        teile.append(f"[{aktuell}]null[v]")
    else:
        teile.append(f"[{aktuell}]ass={ass}[v]")

    cmd += ["-filter_complex", ";".join(teile), "-map", "[v]", "-map", "0:a?"]
    if a.loudnorm:
        cmd += ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{dauer:.2f}", a.out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit("ffmpeg-Fehler:\n" + r.stderr[-1500:])
    print(f"fertig: {a.out} ({dauer:.1f}s, {len(items)} Einblendungen)")


if __name__ == "__main__":
    main()
