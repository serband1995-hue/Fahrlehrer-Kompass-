#!/usr/bin/env python3
"""Prüft ein fertiges Video, bevor es an Serban geht: Format, Länge, Ton, Lautstärke, Schwarzbilder,
lange Stille am Anfang/Ende, Sicherheitsabstand für die Oberfläche von TikTok/Reels. Optional Vorschaubogen.

Aufruf:  python3 check.py fertig.mp4 [--vertical] [--max-sec 60] [--caption-y 1380] [--sheet bogen.png]
Rückgabe 0 = in Ordnung, 1 = Fehler gefunden. Hinweise (H) sind nur Empfehlungen.
"""
import argparse
import json
import re
import subprocess
import sys


def lauf(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--vertical", action="store_true", help="1080x1920 erwartet")
    ap.add_argument("--landscape", action="store_true", help="1920x1080 erwartet (Kurs, YouTube)")
    ap.add_argument("--max-sec", type=float)
    ap.add_argument("--caption-y", type=int, help="untere Kante der Einblendung (Pixel von oben, bei 1920 Höhe)")
    ap.add_argument("--target-lufs", type=float, default=-16.0)
    ap.add_argument("--sheet")
    a = ap.parse_args()
    fehler, hinweise = [], []

    p = json.loads(lauf(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", a.video]).stdout or "{}")
    v = next((s for s in p.get("streams", []) if s["codec_type"] == "video"), None)
    au = next((s for s in p.get("streams", []) if s["codec_type"] == "audio"), None)
    dauer = float(p.get("format", {}).get("duration", 0))
    if not v:
        sys.exit("FEHLER: kein Bild gefunden")
    w, h = v["width"], v["height"]
    fps = eval(v["r_frame_rate"]) if "/" in v["r_frame_rate"] else float(v["r_frame_rate"])
    print(f"{a.video}: {w}x{h}, {fps:.0f} fps, {dauer:.1f}s, Bild {v['codec_name']}, Ton {au['codec_name'] if au else 'FEHLT'}")

    if a.vertical and (w, h) != (1080, 1920):
        fehler.append(f"Format {w}x{h}, erwartet 1080x1920")
    if a.landscape and (w, h) != (1920, 1080):
        fehler.append(f"Format {w}x{h}, erwartet 1920x1080")
    if v["codec_name"] != "h264":
        hinweise.append("Bild ist nicht H.264 (Plattformen mögen H.264)")
    if not au:
        fehler.append("kein Ton")
    if a.max_sec and dauer > a.max_sec:
        fehler.append(f"zu lang: {dauer:.1f}s (Grenze {a.max_sec:.0f}s)")
    if a.caption_y and a.vertical and a.caption_y > 1500:
        hinweise.append(f"Einblendung bis y={a.caption_y}: unten liegen bei TikTok Name und Beschreibung (ab etwa y=1540). "
                        "Wert aus deinen Screenshots geschätzt, nicht offiziell. Besser höher setzen.")
    if a.vertical:
        hinweise.append("Rechts liegen die Knöpfe (Herz, Kommentar, Teilen) ab etwa x=940. Nichts Wichtiges dorthin setzen.")

    if au:
        r = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-af", "ebur128=peak=true", "-f", "null", "-"])
        m = re.findall(r"I:\s+(-?\d+\.\d+) LUFS", r.stderr)
        pk = re.findall(r"Peak:\s+(-?\d+\.\d+) dBFS", r.stderr)
        if m:
            lufs = float(m[-1])
            print(f"Lautstärke: {lufs:.1f} LUFS" + (f", Spitze {pk[-1]} dBFS" if pk else ""))
            if abs(lufs - a.target_lufs) > 3:
                hinweise.append(f"Lautstärke {lufs:.1f} LUFS, Ziel etwa {a.target_lufs:.0f} (mit --loudnorm angleichen)")
            if pk and float(pk[-1]) > -0.5:
                fehler.append(f"Ton übersteuert (Spitze {pk[-1]} dBFS)")
        s = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-af", "silencedetect=n=-45dB:d=0.7", "-f", "null", "-"])
        starts = [float(x) for x in re.findall(r"silence_start: (-?\d+\.?\d*)", s.stderr)]
        ends = [float(x) for x in re.findall(r"silence_end: (-?\d+\.?\d*)", s.stderr)]
        if starts and starts[0] < 0.3 and ends and ends[0] > 0.7:
            hinweise.append(f"Stille am Anfang ({ends[0]:.1f}s): Hook geht verloren")
        if starts and (len(ends) < len(starts) or (ends and dauer - ends[-1] > 0.7 and starts[-1] > dauer - 1.5)):
            hinweise.append("lange Stille am Ende")

    b = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", a.video, "-vf", "blackdetect=d=0.5:pic_th=0.98", "-an", "-f", "null", "-"])
    schwarz = re.findall(r"black_start:(\d+\.?\d*) black_end:(\d+\.?\d*)", b.stderr)
    for s0, e0 in schwarz:
        fehler.append(f"Schwarzbild von {float(s0):.1f}s bis {float(e0):.1f}s")

    if a.sheet:
        try:
            from PIL import Image
            n, bilder = 6, []
            for i in range(n):
                t = dauer * (i + 0.5) / n
                tmp = f"{a.sheet}.{i}.png"
                lauf(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", a.video,
                      "-frames:v", "1", "-vf", "scale=300:-1", tmp])
                bilder.append(Image.open(tmp))
            bw, bh = bilder[0].size
            bogen = Image.new("RGB", (bw * n + 10 * (n - 1), bh), (255, 255, 255))
            for i, im in enumerate(bilder):
                bogen.paste(im, (i * (bw + 10), 0))
            bogen.save(a.sheet)
            import os
            for i in range(n):
                os.remove(f"{a.sheet}.{i}.png")
            print("Vorschaubogen:", a.sheet)
        except ImportError:
            hinweise.append("Vorschaubogen braucht pillow")

    for f in fehler:
        print("FEHLER:", f)
    for h_ in hinweise:
        print("H:", h_)
    print("Prüfung:", "FEHLER gefunden" if fehler else "in Ordnung")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
