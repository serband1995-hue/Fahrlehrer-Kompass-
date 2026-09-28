# Übergabe-Protokoll: Theorie-Präsentationen Fahrschule Boost

**Für den neuen Chat.** Bitte zuerst komplett lesen, dann erst loslegen.
Stand: 27.09.2026 · Vorgänger-Chat hat Lektion 12 fertiggestellt.

---

## 1. Wer ist der Nutzer?

- **Serband**, Fahrlehrer bei der **Fahrschule Boost** (Offenbach), unterrichtet Theorie Klasse B nach Degener.
- Präsentiert am **Laptop → Smartboard**, nutzt die **PowerPoint-Referentenansicht** (Notizen nur für ihn).
- Theorieabende dauern **180 Minuten**, immer **zwei Lektionen**: 1+2, 3+4, … 11+12. **Pause nach 90 Minuten.**
- Er hat zwei eigene Apps, die in der Präsentation vorkommen dürfen:
  - **Fahrlehrer-Kompass** (GitHub: `serband1995-hue/Fahrlehrer-Kompass-`)
  - **Fahr-Akademie** (GitHub: `serband1995-hue/Fahr-Akademie-`)
- Ab 2027 will er einen **Online-Theoriekurs** anbieten. Das ist erst dran, wenn alle Lektionen fertig sind.

## 2. So will er angesprochen werden (wichtig!)

- **Wenig Text, einfache Sprache, per Du.** Keine langen Berichte.
- **Offene Fragen immer als kurze, nummerierte Liste mit Antwortoptionen** (z. B. „1a, 2b“).
- **Nicht raten**, sondern recherchieren. Wenn etwas unsicher ist: kurz fragen.
- **Auflösungen nur auf Klick.** Nichts darf die Antwort vorher verraten.
- Arbeitsblätter: **1 Seite pro Gruppe**, wenig Text, Tipps & Tricks, kleine Plakat-Skizze unten.
- Er gibt gerne Ideen per Sprachnachricht: die Idee aufgreifen, **erweitern** und als Vorschlag zurückgeben.

## 3. Die Aufgabe im neuen Chat

**Lektion 11 neu erstellen**, im gleichen Look wie Lektion 12. Es gibt **keine alte Datei**, alles muss recherchiert werden.

**Thema laut Rahmenplan (Anlage 1 FahrschAusbO, Grundstoff 11):**
„**Besondere Verkehrssituationen, Folgen von Fehlverhalten**“

Inhalte, die laut Recherche dazugehören (vor dem Bauen **nochmal gegen den Rahmenplan prüfen**):
- Beleuchtung, Fahren bei Dunkelheit und schlechter Sicht
- Verhalten gegenüber Einsatzfahrzeugen (Blaulicht, Gelblicht), Sonderrechte
- Verhalten nach einem Unfall: Absichern, Erste Hilfe, Notruf, Pflichten (§ 34 StVO)
- Folgen von Verstößen: Verwarnung, Bußgeld, Fahrverbot, Strafen
- Fahreignungsregister / Punktesystem (Flensburg)
- Entziehung der Fahrerlaubnis

**Hinweis:** Probezeit, Aufbauseminar und Fahreignungsseminar sind in Lektion 12 schon drin (Folien 11–12). In Lektion 11 nur darauf verweisen, nicht doppelt ausführlich machen.

**Später sinnvoll:** eine Pausen-Folie (90 Min.) und eventuell Lektion 11+12 in einer Datei für den Abend. Vorher fragen.

## 4. Was es schon gibt (Lektion 12, fertig)

- `Lektion12_Lebenslanges_Lernen.pptx`: 47 Folien, ca. 8 MB, dunkles Kino-Design
- `Lektion12_Gruppenarbeit_Arbeitsblaetter.pdf`: 1 Lehrerseite + 3 Gruppenblätter
- Besonderheiten in Lektion 12, die er gut fand:
  - **Statistik-Rennen**: Männer gegen Frauen als Thermometer, 10 Jahre, per Morph weiter zur Alters-Statistik
  - **Echte 3D-Clips** aus der Fahr-Akademie (lokal im Demo-Modus aufgenommen)
  - **Ballon-Moment** und Statement-Folien auf Schwarz
  - QR-Code zum Lerntyp-Test

## 5. Design-Regeln (genau so beibehalten)

| Was | Wert |
|---|---|
| Format | 16:9, pptxgenjs `LAYOUT_WIDE` (13,333 × 7,5 Zoll) |
| Hintergrund | fast schwarz `07080B` mit Lichtschein, Körnung, Vignette (als JPG erzeugt) |
| Akzent | Boost-Orange `FF7A1A`, dazu Amber `FFB547`, Rot `FF4D4D` |
| Text | `F5F2EC` (hell), grau `A7B0BD` |
| Karten | `12161E`, Rand `2A3342` |
| Überschriften | **Cambria** fett |
| Fließtext | **Calibri** |
| Kicker | Calibri fett, Großbuchstaben, Zeichenabstand 5, orange |
| Fußzeile | „FAHRLEHRER SERBAND“ oben rechts, klein, grau |
| Logo | Boost-Logo freigestellt (weiß/orange) auf der Titelfolie |

**Nur Cambria und Calibri verwenden.** Die alte Präsentation hatte Cormorant/Barlow: Die waren nicht installiert, dadurch verrutschte die Schrift. Das war einer der Hauptgründe für den Neubau.

## 6. Animations-Regeln

- **Morph nur sparsam** (5–8 Stellen), dort wo sich wirklich etwas bewegt. Sonst **Klick-Animationen**. Der Laptop ist nicht stark.
- **Keine Objekte außerhalb der Folie** als Morph-Start (das machte die alte Datei langsam).
- Morph-Partner brauchen **denselben Namen mit `!!`-Präfix** auf beiden Folien.
- Fragen zuerst, **Antwort nur auf Klick** (Stempel-, Rise- oder Fly-Effekt).
- Videos: **MP4 (H.264)**, Autostart. App-Clips stumm und in Schleife.
- Datei möglichst klein halten (Bilder als JPG komprimiert, identische Medien zusammenführen).

## 7. Technik: Das Bau-Paket (im ZIP)

| Datei | Inhalt |
|---|---|
| `lib.js` | **Engine**: Folien-Bausteine, alle Animationen (fade, float, rise, flyL/R/B, zoom, grow, stamp, wipe, pulse, kb, move, out, **play** für Videos), Morph-Übergang, eindeutige Objekt-IDs, Medien-Deduplizierung |
| `build.js` | kompletter Aufbau von Lektion 12, **als Vorlage für den Stil** |
| `stats.js` | Statistik-Rennen (Thermometer, Zähler, Morph) |
| `gen.js` | Hintergründe, Foto-Grading, QR-Code |
| `worksheets.js` | Arbeitsblätter HTML → PDF (A4) |
| `art.js` | Original-Engine aus Lektion 9+10: Draufsicht-Szenen, Autos, Radfahrer usw. Gut für Lektion 11, z. B. Einsatzfahrzeug oder Unfallstelle. |

Animations-Syntax in `lib.js`: `{ fx, c: true }` = neuer Klick · `{ a: true }` = danach · ohne = gleichzeitig · `{ auto: true }` = startet von selbst.

**Bekannte Stolperfallen in dieser Umgebung:**
- `apt-get install libreoffice-impress poppler-utils fonts-crosextra-carlito fonts-crosextra-caladea ffmpeg` nötig, sonst funktioniert die Vorschau nicht bzw. Schriftbreiten stimmen nicht.
- `pip install pillow "markitdown[pptx]" defusedxml lxml opencv-python-headless`
- `npm install pptxgenjs jszip sharp react react-dom react-icons qrcode`
- **Viele Webseiten sind gesperrt** (destatis.de, gesetze-im-internet.de, github.io …). WebSearch funktioniert, WebFetch meist nicht. Zahlen über mehrere Suchtreffer absichern.
- pptxgenjs vergibt bei Videos doppelte Objekt-IDs: `lib.js` nummeriert sie deshalb neu. Nicht entfernen.
- Verkehrszeichen: **nur amtliche Grafiken** aus dem npm-Paket `@osm-traffic-signs/converter` (`data-svgs/DE/svgs/DE_<Nummer>.svg`), mit sharp zu PNG.

## 8. Qualitätsprüfung (Pflicht vor Übergabe)

1. `validate.py` aus dem pptx-Skill muss „PASSED“ melden.
2. Alle Folien als Bild rendern und ansehen: kein Überlauf, nichts überlappt, Ränder ≥ 0,5 Zoll.
3. **Unabhängiger Faktencheck durch einen Subagenten**: jede Zahl, jeder Paragraf (StVO, StVG, FeV).
4. **Unabhängige Sichtprüfung durch einen Subagenten** (frischer Blick auf die Renderbilder).
5. Sprechernotizen: kurz, Format ▶ Sagen · ❓ Frage · ✅ Antwort · 🖱 Klicks · ➜ Überleitung.
6. Zum Schluss sagen, was er am Laptop selbst testen soll (Videos, Morph, QR-Codes).

## 9. Geprüfte Fakten aus Lektion 12 (dürfen wiederverwendet werden)

- Verkehrstote Deutschland: 2016: 3.206 · 2017: 3.180 · 2018: 3.275 · 2019: 3.046 · 2020: 2.719 · 2021: 2.562 · 2022: 2.788 · 2023: 2.839 · 2024: 2.770 · 2025: 2.832 (Summe 29.217)
- Männeranteil Verkehrstote rund 76 % (Destatis 2020: 75,9 %)
- 2025: ab 65 Jahre 1.115 Tote (39 %), unter 15 Jahre 74
- Probezeit § 2a StVG · 0,0 Promille und Cannabisverbot für Fahranfänger § 24c StVG · Fahreignungsseminar § 4 Abs. 7 StVG
- 50 km/h ≈ 14 m pro Sekunde · Kampagne „Runter vom Gas“ ist von BMV und DVR (nicht Allianz)

## 10. Vorschlag für den Start im neuen Chat

1. Rahmenplan Grundstoff 11 recherchieren und Serband die Inhaltsliste **kurz** zur Freigabe zeigen.
2. Ablauf für 90 Minuten vorschlagen: Einstieg mit Hook, Kapitel, Quiz, Gruppenarbeit, Merksätze.
3. 2–3 **Wow-Ideen** vorschlagen (so wie das Statistik-Rennen). Zum Beispiel:
   - Rettungsgasse mit animierter Draufsicht
   - Unfallstelle absichern, Schritt für Schritt per Klick
   - Punkte-Rechner Flensburg als Spiel
4. Erst nach seinem „Los“ bauen.
