#!/usr/bin/env python3
"""Untertitel-Dateien (SRT und VTT) aus words.json, und Übersetzungen mit den gleichen Zeiten.

1) Deutsche Untertitel + cues.json:
     python3 subtitles.py words.json untertitel/de
   -> untertitel/de.srt, untertitel/de.vtt, untertitel/cues.json (Nummer, Zeit, Text)
2) Übersetzung einsetzen (Texte stehen in einer Liste, genau so viele wie Einblendungen):
     python3 subtitles.py --apply untertitel/cues.json uebersetzung_en.json untertitel/en
   uebersetzung_en.json:  ["Text 1", "Text 2", ...]
Zeitangaben bleiben identisch, nur der Text wird getauscht. Fachbegriffe vorher von Serban prüfen lassen.
"""
import json
import os
import sys

MAX_ZEICHEN, MAX_ZEILEN, MAX_DAUER, MIN_DAUER = 42, 2, 6.0, 1.0


def zeit(t, vtt=False):
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d}{'.' if vtt else ','}{ms:03d}"


def umbrechen(text, breit=MAX_ZEICHEN):
    if len(text) <= breit:
        return [text]
    worte, zeilen, akt = text.split(), [], ""
    ziel = (len(text) + 1) // 2
    for w in worte:
        if akt and len(akt) + 1 + len(w) > max(ziel, 1) + 6 and len(zeilen) < MAX_ZEILEN - 1:
            zeilen.append(akt)
            akt = w
        else:
            akt = (akt + " " + w).strip()
    zeilen.append(akt)
    return zeilen


def cues_aus_woertern(woerter):
    cues, akt = [], []
    for w in woerter:
        if akt:
            text = " ".join(x["w"] for x in akt) + " " + w["w"]
            lang = len(text) > MAX_ZEICHEN * MAX_ZEILEN - 8
            dau = w["e"] - akt[0]["s"] > MAX_DAUER
            pause = w["s"] - akt[-1]["e"] > 0.7
            satz = akt[-1]["w"][-1] in ".!?" and len(" ".join(x["w"] for x in akt)) > 15
            if lang or dau or pause or satz:
                cues.append(akt)
                akt = []
        akt.append(w)
    if akt:
        cues.append(akt)
    ergebnis = []
    for i, c in enumerate(cues):
        s, e = c[0]["s"], c[-1]["e"] + 0.15
        if i + 1 < len(cues):
            e = min(e, cues[i + 1][0]["s"])
        e = max(e, s + MIN_DAUER) if i + 1 == len(cues) else max(e, s + 0.4)
        ergebnis.append({"i": i + 1, "s": round(s, 2), "e": round(e, 2), "text": " ".join(x["w"] for x in c)})
    return ergebnis


def schreibe(cues, ziel):
    os.makedirs(os.path.dirname(os.path.abspath(ziel)), exist_ok=True)
    srt, vtt = [], ["WEBVTT", ""]
    for c in cues:
        zeilen = "\n".join(umbrechen(c["text"]))
        srt.append(f"{c['i']}\n{zeit(c['s'])} --> {zeit(c['e'])}\n{zeilen}\n")
        vtt.append(f"{zeit(c['s'], True)} --> {zeit(c['e'], True)}\n{zeilen}\n")
    open(ziel + ".srt", "w", encoding="utf-8").write("\n".join(srt))
    open(ziel + ".vtt", "w", encoding="utf-8").write("\n".join(vtt))
    lange = [c["i"] for c in cues if any(len(z) > MAX_ZEICHEN + 6 for z in umbrechen(c["text"]))]
    print(f"{len(cues)} Untertitel -> {ziel}.srt / .vtt" + (f" | zu lange Zeilen bei Nr. {lange[:8]}" if lange else ""))


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
        return
    if a[0] == "--apply":
        if len(a) != 4:
            sys.exit("Aufruf: subtitles.py --apply cues.json uebersetzung.json ziel-ohne-endung")
        cues = json.load(open(a[1], encoding="utf-8"))
        texte = json.load(open(a[2], encoding="utf-8"))
        if isinstance(texte, dict):
            texte = texte.get("cues", [])
        if len(texte) != len(cues):
            sys.exit(f"FEHLER: {len(texte)} Texte, aber {len(cues)} Untertitel. Es muss genau passen.")
        neu = [{**c, "text": str(t).strip()} for c, t in zip(cues, texte)]
        schreibe(neu, a[3])
        return
    if len(a) != 2:
        sys.exit("Aufruf: subtitles.py words.json ziel-ohne-endung")
    woerter = json.load(open(a[0], encoding="utf-8"))["words"]
    cues = cues_aus_woertern(woerter)
    schreibe(cues, a[1])
    json.dump(cues, open(os.path.join(os.path.dirname(os.path.abspath(a[1])), "cues.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
