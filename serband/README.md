# Serband – Landingpage

Cinematische Nachtfahrt als Website: Beim Scrollen fährt das Fahrschulauto durch Wald und Nacht auf die Skyline zu.

## Inhalte ändern

Alle Texte, Links, Fotos, Zahlen und Bewertungen stehen in **`js/config.js`**.
Dort ist alles, was noch fehlt, mit `TODO` markiert:

- `links.bewerten` – direkter Google-Link „Rezension schreiben“ (wird auch als QR-Code gezeigt)
- `fotos.portrait` – dein Foto (z. B. `img/serband-portrait.jpg`)
- `videos.*` – Videos aus der Ausbildung (leer = Animation)
- `zahlen` – echte Zahlen; `wert: null` wird ausgeblendet
- `bewertungen` – echte Bewertungen; `platzhalter: true` entfernen

## Aufbau

| Datei | Inhalt |
|---|---|
| `index.html` | Seitenstruktur und Texte der Abschnitte |
| `css/style.css` | Design (Farben oben in `:root`) |
| `js/scene.js` | 3D-Welt (Three.js): Straße, Wald, Skyline, Auto, Kamerafahrten |
| `js/main.js` | Scroll-Animationen (GSAP), Reaktionstest, Kalender, Motorsound |
| `vendor/`, `fonts/` | Bibliotheken und Schriften, lokal gespeichert (keine Google-Server) |

Die Seite setzt keine Cookies und nutzt kein Tracking. Der Buchungskalender wird erst nach einem Klick geladen.
