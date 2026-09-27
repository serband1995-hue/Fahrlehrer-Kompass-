# Übergabe-Protokoll: nach Abend Lektion 5 + 6

Stand: 27.09.2026. Gilt zusätzlich zum Protokoll aus Lektion 12 (Design-Regeln, Nutzer, Stil bleiben gleich).

## Was fertig ist
- `Abend_Lektion05_06.pptx`: 83 Folien für den ganzen Abend (180 Min.)
  - Folien 1–52: Lektion 5 (ohne Gruppenarbeit, auf Wunsch)
  - Folie 53: „15 Minuten Pause – es geht gleich weiter“
  - Folien 54–83: Lektion 6 (Verkehrszeichen, Markierungen, Verkehrseinrichtungen, Bahnübergang) mit Gruppenarbeit
- `Lektion06_Gruppenarbeit_Arbeitsblaetter.pdf`: Lehrerseite (inkl. Lösungen L5-Quiz) + 3 Gruppenblätter mit Schilder-Streifen zum Ausschneiden
- Wunsch: Gruppenarbeit nur in der zweiten Lektion des Abends.
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
| `art6.js`, `build6.js` | Grafiken und Folien Lektion 6 (Schilderwald, Nebel-Perspektive, Bahnübergang mit Zug/Schranken, Markierungen, Baustelle) |
| `trans5.js` | Überleitungen (➜) für alle Folien, prüft die Reihenfolge |
| `ws6.js` | Arbeitsblätter Lektion 6 → PDF |

Bauen: `node art5.js && node art6.js && SB=1 node build5.js && node ws6.js` (nur Lektion 5: `NUR5=1`) (SB=1 erzeugt Storyboard-Bilder in `sb/` zur Kontrolle der Fahrwege).

Wichtig:
- Motion-Paths sind **absolut ab der Startposition** des Objekts (nicht kumulativ).
- Blinker sind eigene Bilder, die mitfahren. Blinker mit `{auto:true}` starten sofort.
- Nicht im npm-Paket und daher **nachgezeichnet**: Zusatzzeichen 1002, Baken am Bahnübergang, Verkehrseinrichtungen (außer Leitplatte 626). Zeichen 151/310 fehlen ganz.
- Alles ohne eigene Animation gleitet automatisch herein (`applyGlide` in lib5.js). Antworten immer per Klick.
- Unbekannt/zu testen: echtes Verhalten von Motion-Path + Spin in PowerPoint am Laptop.

## Nächste Lektionen
Nächster Abend: Lektion 7 + 8 (Rahmenplan prüfen). Gruppenarbeit wieder nur in der zweiten Lektion.
