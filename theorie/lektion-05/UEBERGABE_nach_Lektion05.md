# Übergabe-Protokoll: nach Lektion 5

Stand: 27.09.2026. Gilt zusätzlich zum Protokoll aus Lektion 12 (Design-Regeln, Nutzer, Stil bleiben gleich).

## Was fertig ist
- `Lektion05_Vorfahrt_und_Verkehrsregelungen.pptx`: 55 Folien, ca. 1,5 MB, 90 Minuten, endet mit Pausen-Folie
- `Lektion05_Gruppenarbeit_Arbeitsblaetter.pdf`: Lehrerseite (mit allen Lösungen) + 3 Gruppenblätter
- Wunsch von Serband für L5: Fokus Vorfahrt, Kreisverkehr, Ampel, Grünpfeil, Polizei. Grundregel § 1 nur kurz. **Keine App-Vorstellung.** Viele Animationsszenen, alles „cineastisch“.

## Neue Technik (im Ordner `bau/`)
| Datei | Inhalt |
|---|---|
| `geo5.js` | Geometrie der Szenen (Kreuzung, Straße mit Einfahrten, Kreisverkehr) |
| `art5.js` | alle Grafiken: Hintergründe, Szenen, Autos, Polizist, Schilder (amtlich aus npm) |
| `lib5.js` | Engine aus L12 + `spin` (Drehung), Easing für Motion-Paths, `schedule()` |
| `drive5.js` | **Fahr-Choreografie**: `new Actor(...)`, `.drive([['S',d],['T',winkel,radius],['G',x,y],['C',...]])`, `.blink('L')`, `together(...)`, Storyboard |
| `h5.js` | Folien-Bausteine (kicker, title, banner, stampNum, smallLight, carAt, go, vanish) |
| `build5.js`, `turm5.js`, `build5b/c/d.js` | die Folien |
| `ws5.js` | Arbeitsblätter → PDF |

Bauen: `node art5.js && SB=1 node build5.js && node ws5.js` (SB=1 erzeugt Storyboard-Bilder in `sb/` zur Kontrolle der Fahrwege).

Wichtig:
- Motion-Paths sind **absolut ab der Startposition** des Objekts (nicht kumulativ).
- Blinker sind eigene Bilder, die mitfahren. Blinker mit `{auto:true}` starten sofort.
- Zusatzzeichen 1002 (abknickende Vorfahrt) ist nicht im npm-Paket → **nachgezeichnet**.
- Unbekannt/zu testen: echtes Verhalten von Motion-Path + Spin in PowerPoint am Laptop.

## Nächste Lektionen
Rahmenplan-Reihenfolge prüfen. Lektion 6 = Verkehrszeichen und Verkehrseinrichtungen (Abend 5+6).
