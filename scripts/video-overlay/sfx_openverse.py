#!/usr/bin/env python3
"""Lädt echte, aufgenommene Geräusche mit Lizenz CC0 von Openverse in die lokale Bibliothek.

    python3 scripts/video-overlay/sfx_openverse.py whoosh --anzahl 5
    python3 scripts/video-overlay/sfx_openverse.py "car door" "indicator click" --rolle auto --max-sek 6 --index
    python3 scripts/video-overlay/sfx_openverse.py whoosh --nur-suchen          # nur anzeigen, nichts laden

Regeln (fest eingebaut, nicht abschaltbar):
- Suche immer mit license=cc0; jedes Ergebnis wird nochmal geprüft (license == "cc0"), sonst verworfen.
- Kein Schlüssel, kein Konto, es wird nichts hochgeladen. Nur GET-Anfragen an api.openverse.org und an die
  Download-Adresse der Datei (meist cdn.freesound.org).
- Ablage nur lokal in $SFX_BIB/openverse/<rolle>/ (Standard ~/sfx-bibliothek), NIE im Repo.
- Herkunft und Lizenz jeder Datei: herkunft.csv und herkunft.json im Bibliotheksordner.
- --index baut danach den Index von real-sfx neu (scripts/build_index.py), damit mix.py die Klänge findet.
Nur Standardbibliothek, keine Pakete nötig.
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://api.openverse.org/v1/audio/"
UA = "kompass-video-overlay/1.0 (sfx_openverse.py)"
REPO = Path(__file__).resolve().parents[2]
REAL_SFX = REPO / ".claude" / "skills" / "real-sfx"
FELDER = ["datei", "rolle", "suche", "titel", "urheber", "urheber_url", "lizenz", "lizenz_version", "lizenz_url",
          "quelle", "seite", "download", "openverse_id", "dauer_s", "geladen_am"]
ENDUNGEN = {"mp3", "wav", "ogg", "flac", "aiff", "aif", "m4a"}


def holen(url, timeout=30, max_bytes=None):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read(max_bytes + 1 if max_bytes else -1)


def suchen(begriff, seiten=1, page_size=20):
    treffer = []
    for seite in range(1, seiten + 1):
        q = urllib.parse.urlencode({"q": begriff, "license": "cc0", "page_size": page_size, "page": seite,
                                    "mature": "false"})
        try:
            d = json.loads(holen(f"{API}?{q}").decode("utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"WARNUNG Suche '{begriff}' Seite {seite}: {e}", file=sys.stderr)
            break
        treffer += d.get("results") or []
        if seite >= int(d.get("page_count") or 0):
            break
        time.sleep(1.0)  # freundlich zur offenen API (ohne Schlüssel begrenzt)
    return treffer


def sauber(text, n=40):
    t = re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")
    return (t[:n].strip("-") or "klang")


def geeignet(r, max_sek):
    if str(r.get("license", "")).lower() != "cc0":
        return "nicht CC0"
    if r.get("mature"):
        return "als heikel markiert"
    if not str(r.get("url", "")).startswith("https://"):
        return "keine https-Download-Adresse"
    if not re.fullmatch(r"[0-9a-f-]{36}", str(r.get("id", ""))):
        return "ungültige ID"
    ext = str(r.get("filetype") or Path(urllib.parse.urlparse(r["url"]).path).suffix.lstrip(".")).lower()
    if ext not in ENDUNGEN:
        return f"Format {ext or '?'}"
    dauer = (r.get("duration") or 0) / 1000.0
    if max_sek and dauer and dauer > max_sek:
        return f"zu lang ({dauer:.1f} s)"
    return None


def liste_laden(bib):
    p = bib / "herkunft.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else []


def liste_schreiben(bib, rows):
    (bib / "herkunft.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(bib / "herkunft.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FELDER)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FELDER})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("begriffe", nargs="+", help="Suchwörter auf Englisch (z. B. whoosh, 'car door', click)")
    ap.add_argument("--anzahl", type=int, default=5, help="höchstens so viele Dateien je Suchwort (Standard 5)")
    ap.add_argument("--max-sek", type=float, default=12.0, help="längere Dateien überspringen (Standard 12 s)")
    ap.add_argument("--max-mb", type=float, default=8.0, help="größere Dateien überspringen (Standard 8 MB)")
    ap.add_argument("--rolle", help="Unterordner, z. B. whoosh, click, auto (Standard: das Suchwort)")
    ap.add_argument("--bib", help="Bibliothek (Standard: $SFX_BIB/openverse oder ~/sfx-bibliothek/openverse)")
    ap.add_argument("--nur-suchen", action="store_true", help="nur Treffer zeigen, nichts laden")
    ap.add_argument("--index", action="store_true", help="danach den real-sfx-Index neu bauen")
    a = ap.parse_args()

    bib = Path(a.bib) if a.bib else Path(os.environ.get("SFX_BIB") or Path.home() / "sfx-bibliothek") / "openverse"
    bib = bib.expanduser().resolve()
    try:
        bib.relative_to(REPO)
        sys.exit(f"FEHLER: Bibliothek {bib} liegt im Repo. Die Klänge gehören auf das Gerät, nicht ins Repo.")
    except ValueError:
        pass
    if not a.nur_suchen:
        bib.mkdir(parents=True, exist_ok=True)
    rows = liste_laden(bib)
    bekannt = {r["openverse_id"] for r in rows}
    neu = 0
    for begriff in a.begriffe:
        rolle = sauber(a.rolle or begriff, 24)
        treffer = suchen(begriff, seiten=max(1, -(-a.anzahl * 2 // 20)))
        print(f"\n'{begriff}': {len(treffer)} CC0-Treffer")
        geladen = 0
        for r in treffer:
            if geladen >= a.anzahl:
                break
            grund = geeignet(r, a.max_sek)
            dauer = (r.get("duration") or 0) / 1000.0
            zeile = f"  {dauer:5.1f} s  {r.get('title', '')[:50]:50s}  {r.get('creator', '')[:20]:20s} {r.get('source', '')}"
            if grund:
                print(f"{zeile}  -> übersprungen: {grund}")
                continue
            if r["id"] in bekannt:
                print(f"{zeile}  -> schon da")
                geladen += 1
                continue
            if a.nur_suchen:
                print(zeile)
                geladen += 1
                continue
            ext = str(r.get("filetype") or Path(urllib.parse.urlparse(r["url"]).path).suffix.lstrip(".")).lower()
            ziel = bib / rolle / f"{sauber(r.get('title'))}_{r['id'][:8]}.{ext}"
            try:
                daten = holen(r["url"], timeout=60, max_bytes=int(a.max_mb * 1e6))
            except Exception as e:  # noqa: BLE001
                print(f"{zeile}  -> Download fehlgeschlagen: {str(e)[:80]}")
                continue
            if len(daten) > a.max_mb * 1e6:
                print(f"{zeile}  -> übersprungen: größer als {a.max_mb} MB")
                continue
            ziel.parent.mkdir(parents=True, exist_ok=True)
            ziel.write_bytes(daten)
            rows.append({"datei": str(ziel.relative_to(bib)), "rolle": rolle, "suche": begriff,
                         "titel": r.get("title", ""), "urheber": r.get("creator", ""),
                         "urheber_url": r.get("creator_url", ""), "lizenz": "cc0",
                         "lizenz_version": r.get("license_version", ""), "lizenz_url": r.get("license_url", ""),
                         "quelle": r.get("source", ""), "seite": r.get("foreign_landing_url", ""),
                         "download": r["url"], "openverse_id": r["id"], "dauer_s": round(dauer, 2),
                         "geladen_am": time.strftime("%Y-%m-%d")})
            bekannt.add(r["id"])
            geladen += 1
            neu += 1
            print(f"{zeile}  -> {ziel.relative_to(bib)}")
            time.sleep(0.3)
        if not a.nur_suchen:
            liste_schreiben(bib, rows)  # nach jedem Suchwort sichern
    print(f"\n{neu} neue Datei(en). Bibliothek: {bib}  ({len(rows)} insgesamt, Liste: herkunft.csv)")
    if a.index and not a.nur_suchen:
        print("baue den real-sfx-Index neu ...", flush=True)
        env = dict(os.environ)
        env.setdefault("REAL_SFX_INDEX", str(bib.parent / "real-sfx-index.json"))  # wie sfx_setup.sh
        if str(bib) != "/root/sfx-bibliothek/openverse" and "REAL_SFX_CONFIG" not in env:
            cfg = json.loads((REAL_SFX / "config.json").read_text(encoding="utf-8"))
            for lib in cfg.get("libraries", []):
                if lib.get("name") == "openverse-cc0":
                    lib["path"] = str(bib)
            eigene = bib.parent / "real-sfx-config.json"
            eigene.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
            env["REAL_SFX_CONFIG"] = str(eigene)
        subprocess.check_call([sys.executable, str(REAL_SFX / "scripts" / "build_index.py")], cwd=str(REAL_SFX), env=env)


if __name__ == "__main__":
    main()
