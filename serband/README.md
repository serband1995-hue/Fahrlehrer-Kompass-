# Serband – Landingpage

Landingpage als Film in Kapiteln: Prolog → I Ruhe statt Geschrei → II Du bist nicht wie alle (Farbtypen-Quiz) → III Mein Versprechen → IV Die Werkzeuge dahinter → V Dein Weg (mit Reaktionstest + Bestenliste) → VI Los geht's (Buchen, Fragen, Bewerten) → Epilog.

Jedes Kapitel hat einen eigenen Hintergrund (`js/config.js` → `szenen`). Videos werden beim Scrollen gespult; dafür eignen sich Clips mit kurzem Keyframe-Abstand (z. B. `ffmpeg -g 4`).

## Inhalte ändern

Alle Texte, Links, Fotos, Zahlen und Bewertungen stehen in **`js/config.js`**.
Dort ist alles, was noch fehlt, mit `TODO` markiert:

- `szenen` – Hintergrund je Kapitel (Video MP4 + WebM, Standbild quer/hoch)
- `screenshots` – echte App-Screenshots für Kompass und Fahr-Akademie (ersetzen die Beispielansichten)
- `links.bewerten` – direkter Google-Link „Rezension schreiben“ (wird auch als QR-Code gezeigt)
- `fotos.portrait` – dein Foto (z. B. `img/serband-portrait.jpg`)
- `videos.*` – Videos aus der Ausbildung (leer = Animation)
- `zahlen` – echte Zahlen; `wert: null` wird ausgeblendet
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
