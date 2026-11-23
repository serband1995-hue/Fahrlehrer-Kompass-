# Farbvorschläge: weniger Grün im Büro (und später in der App)

Serbands Wunsch: „zu viel Grün überall“. Grün bleibt nur Akzent (Hauptknöpfe, schmaler Strich beim aktiven Eintrag, Haken, Fokus). Alle Flächen werden neutral.
Zwei Vorschläge zur Auswahl. Gebaut ist noch nichts, die CSS-Dateien hier sind nur Überschreib-Dateien für die Bilder.

Bilder: `<heute|a|b>-<start|akte|zahlungsdaten>-<handy|tablet>-<hell|dunkel>.png` (36 Stück, Handy 390×844, Tablet 1024×768 quer).
„heute“ ist der jetzige Stand zum Vergleich. Neu erzeugen: `NODE_PATH=$(npm root -g) node docs/farbvorschlaege/bilder.mjs`.

## Vorschlag A: Anthrazit, neutral
Idee: Dunkel echtes Anthrazit und Grau, hell sauberes Weiß und Hellgrau statt Beige. Kein Grünstich mehr in Hintergrund, Karten und Linien.
Wirkung: Klar und „technisch“. Der aktive Menüpunkt ist eine graue Fläche mit schmalem grünem Strich links, aktive Reiter haben einen grünen Strich unten. Karten haben weiter einen leichten Schatten.
Vorteil: Gute Trennung der Flächen, man sieht sofort, was eine Karte ist. Fast keine Änderung an der Bedienung.
Nachteil: Etwas nüchterner als jetzt; im Dunkelmodus ist der Grünton des Knopfs knapp über der Grenze (4,5:1).

## Vorschlag B: Sehr hell und ruhig
Idee: Hell fast weiß mit sehr sanften Grautönen, dünne Linien statt Schatten, mehr Luft in Karten und Kacheln. Dunkel ein weiches Grau-Blau statt Schwarz-Grün.
Wirkung: Ruhig und modern. Grün ist noch sparsamer: Der aktive Menüpunkt ist nur fett mit schmalem grünem Strich, Reiter nur mit Unterstrich, die Zahlen in den Kacheln sind nicht mehr grün oder gold, sondern in Schriftfarbe. Der Hauptknopf ist ein etwas dunkleres, ruhigeres Grün.
Vorteil: Am wenigsten Grün, Text hat in beiden Modi viel Kontrast, wirkt aufgeräumt.
Nachteil: Flächen heben sich weniger ab (Rahmen nur 1,3:1 hell), auf einem Handy in der Sonne wirkt es blasser. Karten brauchen etwas mehr Platz.

## Kontrastwerte (gemessen mit `kontrast.mjs`, Verhältnis; Text ≥ 4,5, große Schrift/Strich ≥ 3)
| Stand | Text/Fläche | Text/Hintergrund | Grau-Text/Fläche | Hinweistext/Fläche | Knopftext weiß/Grün | Link/Fläche | Grün-Strich/Fläche (≥3) | Rahmen/Fläche |
|---|---|---|---|---|---|---|---|---|
| heute hell | 15.11 | 13.59 | 6.47 | 3.45 | 5.60 | 7.48 | 4.67 | 1.44 |
| heute dunkel | 14.61 | 16.65 | 8.59 | 4.69 | 4.09 | 7.65 | 3.13 | 1.47 |
| A hell | 17.00 | 15.47 | 7.74 | 4.63 | 5.60 | 7.61 | 4.75 | 1.51 |
| A dunkel | 14.00 | 15.85 | 7.77 | 4.64 | 4.53 | 7.95 | 3.02 | 1.50 |
| B hell | 15.43 | 14.92 | 6.81 | 4.68 | 6.33 | 6.33 | 6.33 | 1.29 |
| B dunkel | 12.68 | 14.32 | 7.48 | 4.70 | 4.79 | 7.76 | 3.05 | 1.42 |

Lesehilfe: „Text“ = Haupttextfarbe, „Grau-Text“ = Nebentext, „Hinweistext“ = die blasseste Schriftfarbe, „Knopftext“ = weiße Schrift auf dem grünen Hauptknopf, „Link“ = Link-/Akzentschrift, „Grün-Strich“ = grüner Strich auf der aktiven Menüfläche, „Rahmen“ = Linie auf Karte.
Ergebnis: Beide Vorschläge erfüllen 4,5:1 für Text, Nebentext, Knopf und Link in hell und dunkel. Der blasse Hinweistext liegt „heute“ hell bei 3,45 (zu schwach); A und B sind besser (A 4,63, B 4,68). Das Grün der aktiven Markierung liegt überall ≥ 3 (dunkel knapp, 3,0). Die dünnen Kartenrahmen liegen wie heute bei ca. 1,3 bis 1,5 (nur Zierlinien, Eingabefelder behalten ihre Rahmen).

## Hinweis: Fehler in main (nicht Teil der Farben)
Auf „Zahlungsdaten für Mails“ sind die Auswahlflächen „Test/Echt“ heute kaputt (Auswahlpunkt zieht sich über die ganze Breite, Text steht in einer schmalen Spalte). Ursache: `#zmForm input{width:100%}` in `buero.css` ist stärker als `.formular .zm-wahl input{width:22px}`. Für die Bilder habe ich bei allen drei Ständen dieselbe Korrektur eingespielt, damit nur die Farben verglichen werden. Der Fehler sollte separat behoben werden.

## Empfehlung
Vorschlag A. Er nimmt das Grün klar zurück, bleibt aber in der Bedienung vertraut (Flächen, Schatten, graue Markierung), und der Dunkelmodus ist echtes Anthrazit. Er ist ein sicherer Schritt und lässt sich einfach auch auf die App übertragen. B ist schöner und noch sparsamer mit Grün, wirkt aber auf dem Handy bei Sonne blasser; wer maximale Ruhe will, nimmt B.
