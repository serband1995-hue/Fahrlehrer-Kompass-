# Serband – Landingpage

Landingpage als Film in Kapiteln: Prolog → I Ruhe statt Geschrei → II Du bist nicht wie alle (Farbtypen-Quiz) → III Mein Versprechen → IV Die Werkzeuge dahinter → V Dein Weg (mit Reaktionstest + Bestenliste) → VI Los geht's (Buchen, Fragen, Bewerten) → Epilog.

Jedes Kapitel hat einen eigenen Hintergrund (`js/config.js` → `szenen`): ein Video quer (`video`) und eins hoch fürs Handy (`videoHandy`), jeweils MP4 + WebM, dazu das erste Bild als Standbild (`bild`, `bildHandy`). Die Videos werden beim Scrollen gespult; deshalb sind sie mit kurzem Keyframe-Abstand und ohne B-Frames kodiert (`ffmpeg -g 4 -keyint_min 4 -bf 0`, quer 1600×900, hoch 720×1280, ohne Ton).

Die Szenen (Higgsfield, Kling 3.0, je 5 s) erzählen eine Fahrt von der Nacht in den Morgen: Tiefgarage → Stadtstraße → Kreuzung → Landstraße → Innenraum → Autobahn → Frankfurter Skyline. Der Epilog nutzt das Prolog-Video. Besonderheiten:

- **Kreuzung (Kapitel II):** Die KI konnte die deutsche Ampelfolge nicht zuverlässig darstellen. Das Video ist deshalb mit fester Kamera und roter Ampel erzeugt; Rot → Rot-Gelb → Grün samt Spiegelung auf der Straße ist nachträglich Bild für Bild eingesetzt. In der Hochformat-Fassung driftete die Kamera, sie ist stabilisiert (4 % Zoom); das Auto rollt erst bei Grün an.
- **Landstraße hoch (Kapitel III):** auf 3,3 s gekürzt, danach tauchte ein Fehler im Bild auf.
- **Skyline quer (Kapitel VI):** auf 4,5 s gekürzt, danach verzog sich die Schrift auf dem Dachschild.
- Die WebM-Dateien enthalten das maschinenlesbare KI-Kennzeichen von Kling (AIGC), das bewusst nicht entfernt wird.
- **„Mein Versprechen“:** `weich`/`weichHandy` ist eine vorab unscharf gerechnete Fassung (aus dem Videobild, an dem die Szene steht: quer 2,6 s, hoch 1,55 s), die eingeblendet wird, während das Foto scharf gestellt wird.
- **Datensparmodus:** Ist am Handy „Datensparen“ an, zeigt die Seite nur die Standbilder.

Fotos stehen unter `fotos`: `portrait` (Kapitel III, „Mein Versprechen“) und `unterricht` (Kapitel I, alle erkennbaren Personen haben eingewilligt), je groß + klein fürs Handy; leer = Foto ausblenden.

## Inhalte ändern

Alle Texte, Links, Fotos, Zahlen und Bewertungen stehen in **`js/config.js`**.
Dort ist alles, was noch fehlt, mit `TODO` markiert:

- `screenshots` – echte App-Screenshots für Kompass und Fahr-Akademie (ersetzen die Beispielansichten)
- `links.bewerten` – direkter Google-Link „Rezension schreiben“ (wird auch als QR-Code gezeigt)
- `videos.*` und `zahlen` stehen noch in der Konfiguration, werden von der Seite aber derzeit nicht angezeigt
- `bewertungen` – echte Bewertungen; Platzhalter sind nur unter `?entwurf` sichtbar, live wird der Abschnitt ohne echte Bewertungen ausgeblendet
- `impressum.html` und `datenschutz.html` – gelb markierte Stellen ausfüllen

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenstruktur und Texte der Abschnitte |
| `css/style.css` | Design (Farben oben in `:root`) |
| `js/stage.js` | Bühne: Hintergrund je Kapitel, Video-Spulen beim Scrollen |
| `js/main.js` | Scroll-Animationen (GSAP), Reaktionstest, Kalender, Motorsound |
| `vendor/`, `fonts/` | Bibliotheken und Schriften, lokal gespeichert (keine Google-Server) |

Die Seite setzt keine Cookies und nutzt kein Tracking. Der Buchungskalender wird erst nach einem Klick geladen.
