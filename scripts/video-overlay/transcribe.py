#!/usr/bin/env python3
"""Sprache zu Wörtern mit Zeitstempeln (lokal, nichts wird hochgeladen).
Aufruf:  python3 transcribe.py video.mp4 [words.json] [--model small] [--lang de]
Ergebnis: words.json mit {"duration": s, "words": [{"w": "Wort", "s": 0.12, "e": 0.48}, ...]}
"""
import argparse
import json
import os
import subprocess
import sys


def dauer(pfad):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", pfad], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("ausgabe", nargs="?", default="words.json")
    ap.add_argument("--model", default="small", help="tiny, base, small, medium (größer = genauer, langsamer)")
    ap.add_argument("--lang", default="de")
    ap.add_argument("--glossar", default="aus",
                    help="Datei mit Fachwörtern als Erkennungshilfe (z. B. glossar.txt). Standard aus: im Test ohne Vorteil, "
                         "änderte nur Zahlenschreibweise. Bei echten Fachwörtern in echtem Material ausprobieren.")
    a = ap.parse_args()
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        sys.exit("faster-whisper fehlt: pip install faster-whisper")
    modell = WhisperModel(a.model, device="cpu", compute_type="int8")
    begriffe = ""
    if a.glossar != "aus" and os.path.isfile(a.glossar):
        begriffe = " ".join(open(a.glossar, encoding="utf-8").read().split())
    segmente, _ = modell.transcribe(a.video, language=a.lang, word_timestamps=True, vad_filter=True,
                                    initial_prompt=("Fahrschule, Theorieunterricht. " + begriffe) if begriffe else None)
    woerter = []
    for seg in segmente:
        for w in seg.words or []:
            text = w.word.strip()
            if text:
                woerter.append({"w": text, "s": round(w.start, 2), "e": round(w.end, 2)})
    with open(a.ausgabe, "w", encoding="utf-8") as f:
        json.dump({"duration": round(dauer(a.video), 2), "words": woerter}, f, ensure_ascii=False, indent=1)
    print(f"{len(woerter)} Wörter -> {a.ausgabe}")


if __name__ == "__main__":
    main()
