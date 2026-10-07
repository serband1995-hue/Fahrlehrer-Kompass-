#!/usr/bin/env python3
"""Rendert ein Video mit großen Wort-Einblendungen, eingeblendeten Bildern oder Clips, Lower-Third, Endkarte
mit Logo und optionalem Kino-Look. Der Sprecher bleibt im Vordergrund.

Aufruf:
  python3 render.py video.mp4 --words words.json --out fertig.mp4 [--broll plan.json] [--preset reel|kurs]

Voreinstellungen:
  reel  1080x1920 hochkant, große Wort-Einblendungen, Bild-Karten oben
  kurs  1920x1080 quer (Online-Kurs, Lektion), keine Wort-Einblendungen (Untertitel als Datei), Karte oben rechts

plan.json:
  {"emphasis": ["Alkohol", "0,0"],
   "items": [{"start": 3.2, "end": 5.4, "file": "auge.jpg", "mode": "card", "quelle": "eigen"},
             {"start": 9.0, "end": 10.5, "file": "szene.mp4", "mode": "full", "quelle": "lernszene"},
             {"start": 12.0, "end": 14.0, "file": "bild.png", "quelle": "higgsfield", "ki": true}]}
mode "card" = Karte, Sprecher bleibt sichtbar (Standard). "full" = Zwischenschnitt über das ganze Bild, Ton läuft weiter.
Vor dem Rendern läuft die Textprüfung (lint_text.py). Bei FEHLER wird nicht gerendert, außer mit --no-lint.
Nach dem Rendern liegt neben der Ausgabe eine Liste aller Bildquellen (*.quellen.txt) für die Rechteprüfung.
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import brand  # noqa: E402
import captions  # noqa: E402
import lint_text  # noqa: E402

FPS = 30
BILD = {".jpg", ".jpeg", ".png", ".webp"}
MAX_KARTE = 3.5     # Sekunden: länger lenkt vom Sprecher ab
MAX_VOLL = 2.5
PRESETS = {"reel": (1080, 1920), "kurs": (1920, 1080)}

# Kino-Look nur auf das Sprecher-Bild: etwas mehr Kontrast, dunkelgrüne Schatten, goldene Lichter, Vignette, feines Korn.
LOOK = {
    "cinematic": "eq=contrast=1.10:saturation=0.92:gamma=0.96,"
                 "colorbalance=gs=0.05:bs=0.02:rm=0.02:rh=0.06:gh=0.03:bh=-0.05,"
                 "vignette=angle=PI/4.5,noise=alls=6:allf=t",
}


def ffprobe(pfad, feld):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", feld, "-of", "default=nw=1:nk=1", pfad],
                         capture_output=True, text=True, check=True)
    return out.stdout.strip()


def runde_maske(pfad, w, h, radius):
    from PIL import Image, ImageDraw
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    m.save(pfad)


def schrift(groesse):
    from PIL import ImageFont
    pfad = brand.laden().get("schrift_datei")
    try:
        return ImageFont.truetype(pfad, groesse)
    except Exception:
        return ImageFont.load_default()


def endkarte_png(pfad, w, h):
    """Dunkle Fläche mit Logo (abgerundet) und Name der Marke, Gold-Linie."""
    from PIL import Image, ImageDraw
    b = brand.laden()
    f = b["farben"]
    img = Image.new("RGBA", (w, h), brand.rgb(f["nacht"], 225))
    d = ImageDraw.Draw(img)
    gr = int(min(w, h) * 0.30)
    logo_pfad = os.path.join(brand.REPO, b["logo"])
    if os.path.isfile(logo_pfad):
        logo = Image.open(logo_pfad).convert("RGBA").resize((gr, gr))
        m = Image.new("L", (gr, gr), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, gr - 1, gr - 1], radius=int(gr * 0.2), fill=255)
        img.paste(logo, ((w - gr) // 2, int(h * 0.5) - gr), m)
    sz = int(min(w, h) * 0.06)
    font = schrift(sz)
    text = b["name"]
    tw = d.textlength(text, font=font)
    d.text(((w - tw) / 2, int(h * 0.5) + sz // 2), text, font=font, fill=brand.rgb(f["creme"]))
    y = int(h * 0.5) + sz * 2
    d.rectangle([w // 2 - gr // 3, y, w // 2 + gr // 3, y + 4], fill=brand.rgb(f["gold"]))
    img.save(pfad)


def lowerthird_png(pfad, text, w):
    from PIL import Image, ImageDraw
    f = brand.laden()["farben"]
    sz = max(int(w * 0.022), 28)
    font = schrift(sz)
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    tw = int(probe.textlength(text, font=font))
    bw, bh = tw + sz * 2 + 14, sz * 2 + 20
    img = Image.new("RGBA", (bw, bh), brand.rgb(f["nacht"], 205))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 10, bh], fill=brand.rgb(f["gold"]))
    d.text((sz + 10, (bh - sz) // 2 - 4), text, font=font, fill=brand.rgb(f["creme"]))
    img.save(pfad)
    return bw, bh


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
    ap.add_argument("--preset", choices=sorted(PRESETS), default="reel")
    ap.add_argument("--emphasis", default="", help="Wörter in Gold, mit Komma getrennt (zusätzlich zum Plan)")
    ap.add_argument("--caption-y", type=int, help="untere Kante der Einblendung in Pixel (von oben)")
    ap.add_argument("--card-x", type=int)
    ap.add_argument("--card-y", type=int)
    ap.add_argument("--card-w", type=int)
    ap.add_argument("--card-h", type=int)
    ap.add_argument("--upper", action="store_true", help="Wörter in Großbuchstaben")
    ap.add_argument("--loudnorm", action="store_true", help="Lautstärke angleichen")
    ap.add_argument("--captions", action="store_true", help="Wort-Einblendungen auch beim Preset kurs")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--look", choices=sorted(LOOK), help="Farbstimmung des Sprecher-Bildes")
    ap.add_argument("--lower-third", metavar="TEXT", help="Namens- oder Titelleiste, z. B. „Lektion 1 · Persönliche Voraussetzungen“")
    ap.add_argument("--lower-third-at", type=float, default=0.8, help="Startzeit in Sekunden")
    ap.add_argument("--endcard", type=float, nargs="?", const=1.8, help="Endkarte mit Logo, Dauer in Sekunden (Standard 1,8)")
    ap.add_argument("--no-lint", action="store_true", help="Textprüfung überspringen (nicht empfohlen)")
    a = ap.parse_args()

    W, H = PRESETS[a.preset]
    quer = W > H
    mit_captions = (not a.no_captions) and (a.captions or not quer)
    karte_w = a.card_w or (640 if quer else 800)
    karte_h = a.card_h or (360 if quer else 400)
    karte_x = a.card_x if a.card_x is not None else (W - karte_w - 60 if quer else (W - karte_w) // 2)
    karte_y = a.card_y if a.card_y is not None else (60 if quer else 80)
    cap_y = a.caption_y or int(H * (0.78 if quer else 0.72))

    dauer = float(ffprobe(a.video, "format=duration"))
    plan = json.load(open(a.broll, encoding="utf-8")) if a.broll else {"items": []}
    items = sorted(plan.get("items", []), key=lambda x: x["start"])
    basis = os.path.dirname(os.path.abspath(a.broll)) if a.broll else "."
    fehler, warn = pruefe(items, dauer, basis)

    if not a.no_lint:
        erg = lint_text.pruefe_text(lint_text.text_aus(a.words))
        if a.broll:
            erg += lint_text.pruefe_plan(a.broll)
        if lint_text.ausgeben(erg):
            fehler.append("Textprüfung: harte Regel verletzt (siehe oben). Text ändern oder mit --no-lint bewusst übergehen.")
    for w in warn:
        print("HINWEIS:", w)
    if fehler:
        sys.exit("FEHLER:\n  " + "\n  ".join(fehler))

    tmp = tempfile.mkdtemp(prefix="overlay_")
    woerter = json.load(open(a.words, encoding="utf-8"))["words"]
    if a.endcard:   # während der Endkarte keine Wort-Einblendungen
        woerter = [w for w in woerter if w["s"] < dauer - a.endcard]
    marke = brand.laden()
    hv = list(plan.get("emphasis", [])) + a.emphasis.split(",")
    ass = os.path.join(tmp, "captions.ass")
    groesse = round(marke["untertitel_groesse_bei_1080"] * min(W, H) / 1080)
    open(ass, "w", encoding="utf-8").write(
        captions.erzeuge(woerter, hv, y=cap_y, gross=a.upper, groesse=groesse, breite=W, hoehe=H))

    # Alle Einblendungen als einheitliche Liste (Bilder, Lower-Third, Endkarte)
    ebenen = []
    for it in items:
        modus = it.get("mode", "card")
        ebenen.append({"s": it["start"], "e": it["end"], "pfad": it["_pfad"], "modus": modus,
                       "w": W if modus == "full" else karte_w, "h": H if modus == "full" else karte_h,
                       "x": 0 if modus == "full" else karte_x, "y": 0 if modus == "full" else karte_y})
    if a.lower_third:
        pfad = os.path.join(tmp, "lt.png")
        bw, bh = lowerthird_png(pfad, a.lower_third, W)
        ebenen.append({"s": a.lower_third_at, "e": min(a.lower_third_at + 5, dauer), "pfad": pfad, "modus": "roh",
                       "w": bw, "h": bh, "x": 60, "y": H - bh - (80 if quer else 420)})
    if a.endcard:
        pfad = os.path.join(tmp, "end.png")
        endkarte_png(pfad, W, H)
        ebenen.append({"s": max(dauer - a.endcard, 0), "e": dauer, "pfad": pfad, "modus": "full", "w": W, "h": H, "x": 0, "y": 0})

    cmd = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", a.video]
    basis_kette = f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1"
    if a.look:
        basis_kette += "," + LOOK[a.look]
    teile = [basis_kette + "[b0]"]
    maske_pfad = os.path.join(tmp, "karte.png")
    if any(e["modus"] == "card" for e in ebenen):
        runde_maske(maske_pfad, karte_w, karte_h, 36)

    idx, aktuell = 1, "b0"
    for i, e in enumerate(ebenen):
        s, t_ende = e["s"], e["e"]
        ext = os.path.splitext(e["pfad"])[1].lower()
        if ext in BILD:
            cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{t_ende - s:.2f}", "-i", e["pfad"]]
        else:
            cmd += ["-t", f"{t_ende - s:.2f}", "-i", e["pfad"]]
        inp = idx
        idx += 1
        if e["modus"] == "roh":
            kette = f"[{inp}:v]fps={FPS},setsar=1,format=yuva420p"
        else:
            kette = (f"[{inp}:v]scale={e['w']}:{e['h']}:force_original_aspect_ratio=increase,crop={e['w']}:{e['h']},"
                     f"fps={FPS},setsar=1,format=yuva420p")
        if e["modus"] == "card":
            cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{t_ende - s:.2f}", "-i", maske_pfad]
            m = idx
            idx += 1
            teile.append(f"[{m}:v]format=gray[m{i}]")
            teile.append(f"{kette}[c{i}];[c{i}][m{i}]alphamerge[a{i}]")
        else:
            teile.append(f"{kette}[a{i}]")
        d = min(0.25, (t_ende - s) / 3)
        teile.append(f"[a{i}]setpts=PTS-STARTPTS+{s}/TB,fade=t=in:st={s}:d={d}:alpha=1,"
                     f"fade=t=out:st={t_ende - d}:d={d}:alpha=1[f{i}]")
        teile.append(f"[{aktuell}][f{i}]overlay=x={e['x']}:y={e['y']}:enable='between(t,{s},{t_ende})':eof_action=pass[b{i + 1}]")
        aktuell = f"b{i + 1}"

    teile.append(f"[{aktuell}]ass={ass}[v]" if mit_captions else f"[{aktuell}]null[v]")
    cmd += ["-filter_complex", ";".join(teile), "-map", "[v]", "-map", "0:a?"]
    if a.loudnorm:
        cmd += ["-af", "loudnorm=I=-16:TP=-1.5:LRA=11"]
    cmd += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", f"{dauer:.2f}", a.out]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        sys.exit("ffmpeg-Fehler:\n" + r.stderr[-1500:])

    liste = os.path.splitext(a.out)[0] + ".quellen.txt"
    with open(liste, "w", encoding="utf-8") as f:
        f.write(f"Quellen der Einblendungen in {os.path.basename(a.out)}\n")
        for it in items:
            f.write(f"{it['start']:.1f}-{it['end']:.1f}s  {os.path.basename(it['file'])}  quelle={it.get('quelle', '?')}"
                    f"{'  KI-erzeugt (Kennzeichnung prüfen)' if it.get('ki') else ''}\n")
        if not items:
            f.write("keine Bild-Einblendungen\n")
    print(f"fertig: {a.out} ({dauer:.1f}s, {W}x{H}, {len(items)} Bild-Einblendungen) | Quellen: {liste}")


if __name__ == "__main__":
    main()
