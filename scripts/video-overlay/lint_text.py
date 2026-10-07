#!/usr/bin/env python3
"""Prüft Texte und Bild-Quellen eines Videos gegen Serbans Regeln (siehe regeln.json), bevor etwas gerendert wird.

Aufruf:  python3 lint_text.py words.json [plan.json]      (oder eine Textdatei statt words.json)
Rückgabe 0 = nichts Hartes, 1 = FEHLER gefunden. Warnungen (W) sind Hinweise zum Prüfen.
"""
import json
import os
import re
import sys

HIER = os.path.dirname(os.path.abspath(__file__))


def regeln():
    return json.load(open(os.path.join(HIER, "regeln.json"), encoding="utf-8"))


def text_aus(pfad):
    roh = open(pfad, encoding="utf-8").read()
    try:
        d = json.loads(roh)
        return " ".join(w["w"] for w in d["words"])
    except (ValueError, KeyError, TypeError):
        return roh


def pruefe_text(text):
    r = regeln()
    ergebnis = []
    for stufe, liste in (("FEHLER", r["fehler"]), ("W", r["warnungen"])):
        for regel in liste:
            flags = 0 if "[A-Z" in regel["muster"] else re.IGNORECASE
            for m in re.finditer(regel["muster"], text, flags):
                start = max(m.start() - 25, 0)
                ergebnis.append((stufe, regel["text"], text[start:m.end() + 25].replace("\n", " ")))
                break
    return ergebnis


def pruefe_plan(plan_pfad):
    r = regeln()
    plan = json.load(open(plan_pfad, encoding="utf-8"))
    ergebnis = []
    for i, it in enumerate(plan.get("items", []), 1):
        name = os.path.basename(it["file"]).lower()
        if any(k in name for k in r["quellen_warnung"]):
            ergebnis.append(("W", f"Einblendung {i}: Dateiname „{it['file']}“ sieht nach fremdem Material aus (Urheberrecht). Nur eigenes oder lizenziertes Material.", ""))
        if not it.get("quelle"):
            ergebnis.append(("W", f"Einblendung {i}: keine „quelle“ im Plan (eigen, canva, higgsfield, lernszene, verkehrszeichen …). Wird für die Rechte-Liste gebraucht.", ""))
        if it.get("ki"):
            ergebnis.append(("W", f"Einblendung {i}: KI-erzeugt. Bei fotorealistischem Eindruck KI-Kennzeichnung setzen (EU AI Act Art. 50, laut Vault ab 02.08.2026).", ""))
    return ergebnis


def ausgeben(ergebnis):
    for stufe, text, kontext in ergebnis:
        print(f"{stufe}: {text}" + (f"  [… {kontext} …]" if kontext else ""))
    return 1 if any(e[0] == "FEHLER" for e in ergebnis) else 0


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    erg = pruefe_text(text_aus(sys.argv[1]))
    if len(sys.argv) > 2:
        erg += pruefe_plan(sys.argv[2])
    code = ausgeben(erg)
    print("Textprüfung:", "FEHLER gefunden" if code else ("Hinweise vorhanden" if erg else "in Ordnung"))
    sys.exit(code)


if __name__ == "__main__":
    main()
