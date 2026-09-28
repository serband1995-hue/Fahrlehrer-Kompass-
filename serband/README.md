# Serband – Landingpage

Cinematische Landingpage im Stil einer Autowerbung: Ein großes Nachtbild (SUV vor der Frankfurter Skyline) wird beim Scrollen wie mit einer Kamera abgefahren, dazu Lichtstreifen, Regen und Scheinwerfer.

## Inhalte ändern

Alle Texte, Links, Fotos, Zahlen und Bewertungen stehen in **`js/config.js`**.
Dort ist alles, was noch fehlt, mit `TODO` markiert:

- `kino.bild` / `kino.bildHandy` – Hintergrundbild quer und hoch (ohne Schrift, möglichst groß)
- `kino.video` – Eröffnungsvideo (WebM + MP4), läuft nach „Motor starten“ und am Ende
- `links.bewerten` – direkter Google-Link „Rezension schreiben“ (wird auch als QR-Code gezeigt)
- `fotos.portrait` – dein Foto (z. B. `img/serband-portrait.jpg`)
- `videos.*` – Videos aus der Ausbildung (leer = Animation)
- `zahlen` – echte Zahlen; `wert: null` wird ausgeblendet
- `bewertungen` – echte Bewertungen; `platzhalter: true` entfernen
- `impressum.html` und `datenschutz.html` – gelb markierte Stellen ausfüllen

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenstruktur und Texte der Abschnitte |
| `css/style.css` | Design (Farben oben in `:root`) |
| `js/cinema.js` | Kinoleinwand: Kamerafahrten über das Bild, Lichtstreifen, Regen, Scheinwerfer |
| `js/main.js` | Scroll-Animationen (GSAP), Reaktionstest, Kalender, Motorsound |
| `vendor/`, `fonts/` | Bibliotheken und Schriften, lokal gespeichert (keine Google-Server) |

Die Seite setzt keine Cookies und nutzt kein Tracking. Der Buchungskalender wird erst nach einem Klick geladen.
