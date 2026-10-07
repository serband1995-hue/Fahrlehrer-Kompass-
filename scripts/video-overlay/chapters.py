#!/usr/bin/env python3
"""Kapitelmarken für Videos (Akademie-Eingabe „mm:ss Titel“, YouTube-Beschreibung) und Kandidaten aus dem Text.

1) Kandidaten ansehen (Stellen nach längeren Pausen, mit den nächsten Wörtern):
     python3 chapters.py --suggest words.json [--min-pause 1.2]
   Daraus wählt Claude (und Serban) die echten Kapitel aus.
2) Kapitel prüfen und ausgeben:
     python3 chapters.py chapters.json [--dauer 612.4]
   chapters.json: [{"t": 0, "titel": "Einstieg"}, {"t": 95.5, "titel": "Sehtest"}, ...]
Regeln: aufsteigende Zeiten, Titel höchstens 120 Zeichen (Akademie), für YouTube: erstes Kapitel bei 0:00,
mindestens 3 Kapitel, jedes mindestens 10 Sekunden lang.
"""
import json
import sys


def mmss(t):
    t = int(round(t))
    h, rest = divmod(t, 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def vorschlag(pfad, min_pause):
    woerter = json.load(open(pfad, encoding="utf-8"))["words"]
    print(f"Kandidaten (Pause ab {min_pause}s):")
    print(f"  {mmss(0)}  {' '.join(w['w'] for w in woerter[:6])}")
    for a, b, i in ((woerter[k], woerter[k + 1], k + 1) for k in range(len(woerter) - 1)):
        pause = b["s"] - a["e"]
        if pause >= min_pause:
            print(f"  {mmss(b['s'])}  (Pause {pause:.1f}s)  {' '.join(w['w'] for w in woerter[i:i + 6])}")


def pruefe(kap, dauer):
    fehler, hinweise = [], []
    if not kap:
        return ["keine Kapitel"], []
    for i, k in enumerate(kap):
        if len(k["titel"]) > 120:
            fehler.append(f"Kapitel {i + 1}: Titel länger als 120 Zeichen")
        if not k["titel"].strip():
            fehler.append(f"Kapitel {i + 1}: Titel leer")
        if i and k["t"] <= kap[i - 1]["t"]:
            fehler.append(f"Kapitel {i + 1}: Zeit nicht größer als beim vorherigen")
        if dauer and k["t"] >= dauer:
            fehler.append(f"Kapitel {i + 1}: Zeit {mmss(k['t'])} liegt nach dem Videoende")
    if kap[0]["t"] != 0:
        hinweise.append("YouTube braucht ein erstes Kapitel bei 0:00")
    if len(kap) < 3:
        hinweise.append("YouTube braucht mindestens 3 Kapitel")
    for i in range(len(kap) - 1):
        if kap[i + 1]["t"] - kap[i]["t"] < 10:
            hinweise.append(f"Kapitel {i + 1} ist kürzer als 10 s (YouTube)")
    return fehler, hinweise


def main():
    a = sys.argv[1:]
    if not a or a[0] in ("-h", "--help"):
        print(__doc__)
        return
    if a[0] == "--suggest":
        mp = float(a[a.index("--min-pause") + 1]) if "--min-pause" in a else 1.2
        vorschlag(a[1], mp)
        return
    kap = json.load(open(a[0], encoding="utf-8"))
    dauer = float(a[a.index("--dauer") + 1]) if "--dauer" in a else None
    fehler, hinweise = pruefe(kap, dauer)
    for f in fehler:
        print("FEHLER:", f)
    for h in hinweise:
        print("H:", h)
    if fehler:
        sys.exit(1)
    print("\nAkademie (Verwaltung → Video bearbeiten, Kapitel):")
    for k in kap:
        print(f"{mmss(k['t'])} {k['titel']}")
    print("\nYouTube-Beschreibung:")
    for k in kap:
        print(f"{mmss(k['t'])} {k['titel']}")


if __name__ == "__main__":
    main()
