#!/usr/bin/env python3
"""Große Wort-Einblendungen (ASS) aus words.json: 1 bis 3 Wörter pro Einblendung, kurzer Pop-Effekt,
Schlüsselwörter in Gold. Aufruf:  python3 captions.py words.json captions.ass [--emphasis "Wort,Wort"]
"""
import argparse
import json
import re

GOLD = "&H0037AFD4&"   # ASS nutzt BGR: Gold D4AF37
WEISS = "&H00FFFFFF&"


def zeit(t):
    t = max(t, 0)
    h, rest = divmod(t, 3600)
    m, s = divmod(rest, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def sauber(text):
    return re.sub(r"[{}\\]", "", text)


def blaetter(woerter, max_woerter=3, max_zeichen=18, max_pause=0.4):
    gruppen, akt = [], []
    for w in woerter:
        if akt:
            zeichen = sum(len(x["w"]) + 1 for x in akt) + len(w["w"])
            pause = w["s"] - akt[-1]["e"]
            satzende = akt[-1]["w"][-1] in ".,!?;:"
            if len(akt) >= max_woerter or zeichen > max_zeichen or pause > max_pause or satzende:
                gruppen.append(akt)
                akt = []
        akt.append(w)
    if akt:
        gruppen.append(akt)
    return gruppen


def erzeuge(woerter, hervorheben=(), font="Liberation Sans", groesse=116, y=1380, breite=1080, hoehe=1920, gross=False):
    hv = {h.strip().lower().strip(".,!?") for h in hervorheben if h.strip()}
    kopf = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {breite}
PlayResY: {hoehe}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Gross,{font},{groesse},{WEISS},{WEISS},&H00000000&,&H80000000&,-1,0,0,0,100,100,0,0,1,7,3,2,60,60,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    gruppen = blaetter(woerter)
    zeilen = []
    for i, g in enumerate(gruppen):
        start = g[0]["s"]
        ende = g[-1]["e"] + 0.2
        if i + 1 < len(gruppen):
            ende = min(ende, gruppen[i + 1][0]["s"])
        ende = max(ende, start + 0.3)
        teile = []
        for w in g:
            t = sauber(w["w"].upper() if gross else w["w"])
            if w["w"].lower().strip(".,!?;:") in hv:
                teile.append(f"{{\\c{GOLD}}}{t}{{\\c{WEISS}}}")
            else:
                teile.append(t)
        pop = "{\\an2\\pos(%d,%d)\\fscx82\\fscy82\\t(0,110,\\fscx100\\fscy100)}" % (breite // 2, y)
        zeilen.append(f"Dialogue: 0,{zeit(start)},{zeit(ende)},Gross,,0,0,0,,{pop}{' '.join(teile)}")
    return kopf + "\n".join(zeilen) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("words")
    ap.add_argument("ausgabe")
    ap.add_argument("--emphasis", default="")
    ap.add_argument("--y", type=int, default=1380)
    ap.add_argument("--upper", action="store_true")
    a = ap.parse_args()
    daten = json.load(open(a.words, encoding="utf-8"))
    open(a.ausgabe, "w", encoding="utf-8").write(erzeuge(daten["words"], a.emphasis.split(","), y=a.y, gross=a.upper))
    print("Einblendungen ->", a.ausgabe)


if __name__ == "__main__":
    main()
