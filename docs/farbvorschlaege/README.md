# Farbvorschläge: weniger Grün im Büro (und später in der App)

Serbands Wunsch: „zu viel Grün überall“. Grün bleibt nur Akzent (Hauptknöpfe, schmaler Strich beim aktiven Eintrag, Haken, Fokus). Alle Flächen werden neutral.
Zwei Vorschläge zur Auswahl. Gebaut ist noch nichts; die CSS-Dateien hier sind nur Überschreib-Dateien für die Bilder.
Stand nach Fables Prüfung: A „abgenommen nach Reparatur R1–R4“ (eingearbeitet), B hell nachgebessert (Grund dunkler, Linien kräftiger, Menüfläche).

Bilder: `<heute|a|b>-<ansicht>-w<Breite>-<hell|dunkel>.png` (54 Stück). „heute“ ist der jetzige Stand zum Vergleich.
Ansichten: `start`, `akte` (Schüler s3 mit „Zahlung per Mail“), `zahlungsdaten` bei 360 und 1024, jeweils hell und dunkel; `start` und `super` (Super-Admin, Serbands Leiste) bei 1280 hell und dunkel; `kalender` und `buero` (Büro-Rolle) bei 1280 hell.
Neu erzeugen: `NODE_PATH=$(npm root -g) node docs/farbvorschlaege/bilder.mjs`. Kontrast neu rechnen: `node docs/farbvorschlaege/kontrast.mjs`.

## Vorschlag A: Anthrazit, neutral
Idee: Dunkel echtes Anthrazit und Grau, hell sauberes Weiß und Hellgrau statt Beige. Kein Grünstich in Hintergrund, Karten und Linien.
Wirkung: Klar und „technisch“. Aktiver Menüpunkt = graue Fläche mit schmalem grünem Strich links. Aktiver Reiter = graue Pille mit grünem Ring (Rahmen). Die vielen „… erhalten“-Knöpfe in den Fristen sind jetzt Umriss-Knöpfe, nur die Hauptknöpfe sind grün gefüllt.
Vorteil: Gute Trennung der Flächen, Karten bleiben auch in der Sonne gut sichtbar. Kaum Änderung an der Bedienung.
Nachteil: Etwas nüchterner als jetzt.

## Vorschlag B: Sehr hell und ruhig
Idee: Hell sehr ruhig mit Grautönen, dünne Linien statt Schatten, mehr Luft. Dunkel weiches Grau-Blau statt Schwarz-Grün.
Nachgebessert: Der Grund ist hell etwas dunkler (#f1f1f4) und die Linien kräftiger (#cdcdd5), damit Karten und Felder in der Sonne nicht verschwinden. Der aktive Menüpunkt hat wieder eine leichte Fläche plus grünen Strich. Kachelzahlen sind nicht mehr grün oder gold.
Vorteil: Am wenigsten Grün, ruhiger Eindruck.
Nachteil: Flächen heben sich weniger ab als in A; braucht mehr Platz in Karten.

## Was beide Vorschläge zusätzlich beheben (Altlasten)
- Eigene Feldrahmen-Farbe `--feld` (hell ≈ 3,3:1 bis 3,7:1 auf Hintergrund und Karte, dunkel 3,7:1 bis 4,4:1) für alle Eingabefelder, Suchfelder, Auswahllisten, Textfelder. Betrifft buero.css Zeilen 71, 82, 171, 299, 413, 735, 759 (Selektoren stehen in den CSS-Dateien). Heute liegen die Rahmen bei 1,3 bis 1,7 (zu schwach).
  Richtigstellung: Der frühere Satz „Eingabefelder behalten ihre Rahmen“ war falsch gemeint; sie hatten keinen ausreichenden Rahmen. Jetzt haben sie ihn.
- Fokus-Ring deckend (`--fokus`): hell 6,3:1, dunkel 7,8:1 (heute 1,5 bzw. 2,0).
- Dunkel: Pille „rot“ heller (#f5a094), blau heller (#7db4f0); hell: Blau dunkler (#1d62b0, Pille 5,3:1 statt 3,6:1).
- Dunkel: Hover am Hauptknopf wird dunkler statt heller (weiße Schrift 6,2:1 statt 2,2:1).
- Grüner Text hell („gelesen“, „Ergebnis ja“) in dunklerem Grün: 6,6:1 statt 3,4:1.
- Weiße Zahl im roten Punkt dunkel: Punkt dunkler (#b3392b), 5,9:1 statt 3,2:1.
- Schalter „aus“ in Feldrahmen-Farbe (3,7:1), Platzhaltertext in Nebentext-Farbe (≥ 6:1).
- Hell: Gelb (#a07018) und Orange (#b05a14) dunkler, damit gelbe Zahlen und Orange-Text lesbar sind (3,8:1 und 4,9:1 statt 2,8 und 3,2). Das gelbe „Test“-Pillchen behält ein helles Gelb mit dunkler Schrift. Im dunklen Modus gelten wieder die hellen Töne (#d9a64a, #ec9a4f), sonst wären gelbe Pills dort zu blass.
- Rollenstreifen: Super-Admin (`.rollen-streifen`, war Dunkelgrün) jetzt neutral #2b2d33, Büro #4c4f57 (A) bzw. #555a66 (B).
- Kalender: Fahrstunden waren grün (`K_FARBEN.fahrstunde`, `#3a7350` in buero.js, Zeile 2261). Per CSS-Attribut überschrieben auf neutrales Grau (#7d7d86, klar anders als Nacht/Sonder in Blau), siehe Bilder `kalender`. Beim Einbau besser direkt in `K_FARBEN` ändern.
- Beim Einbau werden `theme-color` (buero.html Zeile 10) und buero-manifest.json (Zeilen 9 bis 10) ebenfalls neutral.

## Kontrastwerte (Verhältnis; ✗ = unter dem Mindestwert; „min“ 0 = nur zum Vergleich der Abhebung)
Rechnung mit `kontrast.mjs` (aus Fables Tabelle übernommen und um die neuen Werte erweitert). Text ≥ 4,5, große Schrift/Rahmen/Ring ≥ 3.

| Paar | min | heute hell | heute dunkel | A hell | A dunkel | B hell | B dunkel |
|---|---|---|---|---|---|---|---|
| txt/su | 4.5 | 15.11 | 14.61 | 17.00 | 14.00 | 15.43 | 12.68 |
| txt/bg | 4.5 | 13.59 | 16.65 | 15.47 | 15.85 | 13.69 | 14.32 |
| txt/su2 | 4.5 | 12.43 | 12.81 | 14.41 | 12.25 | 12.75 | 11.19 |
| muted/su | 4.5 | 6.47 | 8.59 | 7.74 | 7.77 | 6.81 | 7.48 |
| muted/bg | 4.5 | 5.82 | 9.78 | 7.04 | 8.79 | 6.04 | 8.45 |
| muted/su2 (Pill neutral) | 4.5 | 5.33 | 7.52 | 6.56 | 6.80 | 5.63 | 6.60 |
| faint/su (th,Gruppen) | 4.5 | 3.45 ✗ | 4.69 | 5.69 | 5.69 | 5.68 | 5.67 |
| faint/bg | 4.5 | 3.11 ✗ | 5.35 | 5.18 | 6.44 | 5.04 | 6.40 |
| faint/su2 | 4.5 | 2.84 ✗ | 4.11 ✗ | 4.82 | 4.98 | 4.70 | 5.00 |
| weiss/akzent (Knopf) | 4.5 | 5.60 | 4.09 ✗ | 5.60 | 4.53 | 6.33 | 4.79 |
| weiss/Knopf-hover | 4.5 | 7.61 | 2.15 ✗ | 7.61 | 6.19 | 6.33 | 6.36 |
| link akd/su | 4.5 | 7.48 | 7.65 | 7.61 | 7.95 | 6.33 | 7.76 |
| link akd/bg | 4.5 | 6.73 | 8.72 | 6.93 | 9.00 | 5.62 | 8.77 |
| link akd/su2 | 4.5 | 6.16 | 6.70 | 6.45 | 6.96 | 5.24 | 6.85 |
| akd/aks-su (kopf-wer usw.) | 4.5 | 6.37 | 5.97 | 6.76 | 6.45 | 5.76 | 6.47 |
| nav aktiv Text | 4.5 | 6.37 | 5.97 | 14.41 | 12.25 | 12.75 | 11.19 |
| nav Strich/navbg | 3 | 4.69 | 3.13 | 5.37 | 6.96 | 5.24 | 6.85 |
| nav Strich/su | 3 | 5.51 | 4.02 | 6.33 | 7.95 | 6.33 | 7.76 |
| nav aktiv Fläche/su (Abhebung) | - | 1.18 | 1.28 | 1.18 | 1.14 | 1.21 | 1.13 |
| tab aktiv Text | 4.5 | 5.60 | 4.09 ✗ | 14.41 | 12.25 | 15.43 | 12.68 |
| tab Ring akzent/tabbg | 3 | 1.00 ✗ | 1.00 ✗ | 5.37 | 6.96 | 6.33 | 7.76 |
| tab Ring akzent/bg | 3 | 4.95 | 4.58 | 5.76 | 9.00 | 5.62 | 8.77 |
| tab inaktiv muted/bg | 4.5 | 5.82 | 9.78 | 7.04 | 8.79 | 6.04 | 8.45 |
| Fokusring/su | 3 | 1.48 ✗ | 2.03 ✗ | 6.33 | 7.95 | 6.33 | 7.76 |
| Fokusring/bg | 3 | 1.45 ✗ | 2.03 ✗ | 5.76 | 9.00 | 5.62 | 8.77 |
| Fokusring/su2 | 3 | 1.43 ✗ | 1.97 ✗ | 5.37 | 6.96 | 5.24 | 6.85 |
| Feldrahmen/bg(Feld) | 3 | 1.30 ✗ | 1.67 ✗ | 3.33 | 4.23 | 3.24 | 4.43 |
| Feldrahmen/su(Karte) | 3 | 1.44 ✗ | 1.47 ✗ | 3.66 | 3.74 | 3.65 | 3.92 |
| Feldrahmen/su2 | 3 | 1.19 ✗ | 1.29 ✗ | 3.10 | 3.27 | 3.02 | 3.46 |
| Feld bg/su | - | 1.11 | 1.14 | 1.10 | 1.13 | 1.13 | 1.13 |
| Karte su/bg | - | 1.11 | 1.14 | 1.10 | 1.13 | 1.13 | 1.13 |
| Kartenrahmen lns/bg | - | 1.15 | 1.36 | 1.16 | 1.33 | 1.40 | 1.36 |
| su2/su | - | 1.22 | 1.14 | 1.18 | 1.14 | 1.21 | 1.13 |
| su2/bg | - | 1.09 | 1.30 | 1.07 | 1.29 | 1.07 | 1.28 |
| zm-wahl aktiv Rahmen | 3 | 5.51 | 4.02 | 17.00 | 14.00 | 15.43 | 12.68 |
| Pill rot | 4.5 | 5.62 | 4.29 ✗ | 5.71 | 6.29 | 5.71 | 5.94 |
| Pill rot auf bg | 4.5 | 5.09 | 4.93 | 5.23 | 7.14 | 5.11 | 6.66 |
| Pill gelb | 4.5 | 5.83 | 5.24 | 5.92 | 4.97 | 5.92 | 4.68 |
| Pill gelb auf bg | 4.5 | 5.32 | 6.10 | 5.45 | 5.67 | 5.33 | 5.27 |
| Pill gruen | 4.5 | 5.75 | 5.49 | 5.83 | 5.27 | 5.83 | 4.92 |
| Pill gruen auf bg | 4.5 | 5.22 | 6.41 | 5.36 | 6.02 | 5.24 | 5.56 |
| Pill blau | 4.5 | 3.59 ✗ | 4.74 | 5.29 | 5.73 | 5.29 | 5.35 |
| Pill blau auf bg | 4.5 | 3.25 ✗ | 5.47 | 4.85 | 6.50 | 4.74 | 6.01 |
| Pill rot auf Warnzeile | 4.5 | 4.86 | 3.51 ✗ | 4.93 | 5.16 | 4.93 | 4.93 |
| Kachel rot/su (gross) | 3 | 4.63 | 5.20 | 4.71 | 4.96 | 4.71 | 4.63 |
| Kachel gruen/su (gross) | 3 | 3.44 | 7.42 | 3.49 | 7.08 | 3.49 | 6.61 |
| Kachel gold/su (gross) | 3 | 3.14 | 6.78 | 3.20 | 6.47 | 3.20 | 6.04 |
| aufgabe rot b (22px fett) | 3 | 3.95 | 4.29 | 4.01 | 4.05 | 4.01 | 3.83 |
| aufgabe gelb b | 3 | 2.78 ✗ | 5.24 | 3.81 | 4.97 | 3.81 | 4.68 |
| txt auf rot-soft | 4.5 | 12.90 | 12.06 | 14.49 | 11.43 | 13.16 | 10.48 |
| weiss/rot (Zahl 14px) | 4.5 | 4.71 | 3.16 ✗ | 4.71 | 5.94 | 4.71 | 5.94 |
| rot Text/su (fehler) | 4.5 | 4.63 | 5.20 | 4.71 | 4.96 | 4.71 | 4.63 |
| gruen Text/su (gelesen, ergebnis-ja) | 4.5 | 3.44 ✗ | 7.42 | 6.63 | 7.08 | 6.63 | 6.61 |
| orange/su | 4.5 | 3.20 ✗ | 7.27 | 4.86 | 6.94 | 4.86 | 6.48 |
| pill-gruen/su (zm-haken) | 4.5 | 6.52 | 7.42 | 6.63 | 7.08 | 6.63 | 6.61 |
| pill-rot/su (gefahr) | 4.5 | 6.59 | 5.20 | 6.70 | 7.71 | 6.70 | 7.20 |
| pill-gelb/su | 4.5 | 6.65 | 7.43 | 6.77 | 7.09 | 6.77 | 6.62 |
| warnhinweis pg/gelbS | 4.5 | 5.83 | 5.24 | 5.92 | 4.97 | 5.92 | 4.68 |
| vorfuehrung | 4.5 | 5.26 | 5.98 | 5.40 | 5.57 | 5.28 | 5.16 |
| zm-pill-test | 4.5 | 5.17 | 7.54 | 7.54 | 7.54 | 7.54 | 7.54 |
| zm-echt | 4.5 | 8.35 | 8.35 | 8.35 | 8.35 | 8.35 | 8.35 |
| Rollenstreifen weiss | 4.5 | 6.46 | 6.46 | 13.76 | 13.76 | 13.76 | 13.76 |
| toast bg/txt | 4.5 | 13.59 | 16.65 | 15.47 | 15.85 | 13.69 | 14.32 |
| h1 Text | 4.5 | 13.29 | 11.69 | 14.80 | 11.50 | 13.77 | 10.72 |
| h2 Text | 4.5 | 11.11 | 8.25 | 12.25 | 8.66 | 11.98 | 8.67 |
| h1/su | - | 1.14 | 1.25 | 1.15 | 1.22 | 1.12 | 1.18 |
| h2/h1 | - | 1.20 | 1.42 | 1.21 | 1.33 | 1.15 | 1.24 |
| pr-betrag | 4.5 | 7.48 | 7.65 | 7.61 | 7.95 | 15.43 | 12.68 |
| Schalter gruen/su | 3 | 3.44 | 7.42 | 3.49 | 7.08 | 3.49 | 6.61 |
| Schalter aus Bahn/su | 3 | 1.44 ✗ | 1.47 ✗ | 3.66 | 3.74 | 3.65 | 3.92 |
| pin-punkte akzent/su | 3 | 5.51 | 4.02 | 5.60 | 3.46 | 6.33 | 3.05 |
| Diagramm/su | 3 | 4.50 | 5.58 | 4.58 | 5.33 | 4.58 | 4.97 |
| Platzhalter (A/B: Nebentext-Farbe) | 4.5 | 4.07 ✗ | 4.06 ✗ | 7.04 | 8.79 | 6.04 | 8.45 |

Rest-Werte unter dem Mindestwert:
- Nur „heute“ (Altlasten, die A und B beheben).
- Die Linien der Karten (Kartenrahmen, Fläche gegen Fläche) sind bewusst nur Zierlinien (Mindestwert 0, kein Pflichtwert); die Felder haben jetzt einen eigenen Rahmen mit ≥ 3:1.
- Fläche gegen Fläche (Karte auf Grund) liegt hell in A bei 1,10 und in B bei 1,13 (dunkel 1,13); die Karten heben sich über Linie (B: #cdcdd5) bzw. Schatten (A) ab.

## Empfehlung
Vorschlag A. Er nimmt das Grün klar zurück, bleibt in der Bedienung vertraut (Flächen, Schatten, graue Markierung), und der Dunkelmodus ist echtes Anthrazit. B ist jetzt auch hell tauglich, wirkt aber auf dem Handy in der Sonne weiter blasser und hat weniger Abhebung.

## Offen
- Der Fehler in main: `#zmForm input{width:100%}` in buero.css macht die Auswahlpunkte „Test/Echt“ riesig (stärker als `.formular .zm-wahl input{width:22px}`). In allen Bildern ist dieselbe kleine Korrektur eingespielt (siehe `bilder.mjs`).
- Die App (index.html) habe ich nicht angesehen; die Farben müssten dort entsprechend übernommen werden.
- Fahrstunden-Farbe im Kalender: per CSS nur über einen Attribut-Trick möglich; sauberer in `K_FARBEN`.
