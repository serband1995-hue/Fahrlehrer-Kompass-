# Zweite Fachprüfung Abend 3 (Klasse C, Lektionen C5 + C6)

Geprüfte Datei: `ABEND3_INHALT.txt`, jetzt **125 Folien** (Folientext und Sprechernotizen). Die erste Prüfung (`PRUEFUNG_ABEND3.md`) bezog sich noch auf 92 Folien. Ihre Foliennummern sind in Abschnitt 3 auf die neue Nummerierung umgerechnet.
Rechtsstand: 03.10.2026. Alle Gesetzestexte habe ich am Prüftag im Wortlaut gelesen. `FAKTEN_C5_C6.md` habe ich nur zum Vergleich genutzt, nicht als Beleg.

---

## 1. Vorgehen und Quellen

**Vorgehen**
1. Ich habe jede Folie und jede Notiz gelesen. Bei Animationsfolien mit gleichem Text habe ich nur die neuen Aussagen geprüft.
2. Ich habe geprüft, ob die 16 Punkte der ersten Prüfung umgesetzt sind (Abschnitt 3).
3. Alle Rechtsaussagen habe ich im aktuellen Wortlaut nachgelesen. Den Änderungsstand der Normen habe ich abgefragt:
   - StVZO: zuletzt geändert am 10.06.2024 (BGBl. 2024 I Nr. 191)
   - StVO: 30.01.2026 (BGBl. 2026 I Nr. 32)
   - BKatV und FeV: 12.08.2026 (BGBl. 2026 I Nr. 236, Berufskraftfahrerqualifikation – betrifft die geprüften Nummern nicht)
4. Alle **49 in den Notizen genannten Prüfungsfragen** habe ich einzeln auf autovio.de abgerufen. Für die Rahmenplan-Prüfung kamen 12 weitere Fragen aus 2.7.06 dazu (Tempomat, AGR, Notbremsassistent). Die 9 Quiz-Folien habe ich Wort für Wort mit dem amtlichen Fragetext und den amtlichen Antworten verglichen.
5. Alle Rechnungen (Anhalteweg, Gefälle, halbes Tempo, Animationszähler) habe ich nachgerechnet.
6. Den Rahmenplan habe ich gegen FahrschAusbO Anlage 2.3 im Original abgeglichen. Mit `grep` habe ich in den anderen Abend-Dateien nachgesehen, ob fehlende Inhalte dort behandelt werden. Diese Dateien habe ich nicht verändert.

**Quellen (gelesen)**
- StVZO § 29, § 34, § 36, § 41, § 41b, § 57b, § 57c, § 57d, Anlage VIII, Anlage VIIIa:
  - https://www.gesetze-im-internet.de/stvzo_2012/__29.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__34.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__36.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__41.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__41b.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__57b.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__57c.html
  - https://www.gesetze-im-internet.de/stvzo_2012/__57d.html
  - https://www.gesetze-im-internet.de/stvzo_2012/anlage_viii.html
  - https://www.gesetze-im-internet.de/stvzo_2012/anlage_viiia.html
- StVO § 2, § 3, § 18, § 23:
  - https://www.gesetze-im-internet.de/stvo_2013/__2.html
  - https://www.gesetze-im-internet.de/stvo_2013/__3.html
  - https://www.gesetze-im-internet.de/stvo_2013/__18.html
  - https://www.gesetze-im-internet.de/stvo_2013/__23.html
- BKatV-Anlage: https://www.gesetze-im-internet.de/bkatv_2013/anlage.html
- FeV Anlage 13: https://www.gesetze-im-internet.de/fev_2010/anlage_13.html
- FahrschAusbO § 4 und Anlage 2.3:
  - https://www.gesetze-im-internet.de/fahrschausbo_2012/__4.html
  - https://www.gesetze-im-internet.de/fahrschausbo_2012/anlage_2_3.html
- RL 71/320/EWG, Anhänge I, II, III, IV, V, X: https://gesetze.legal/eu/rl_71_320_ewg/anhang_i (entsprechend `anhang_ii`, `anhang_iii`, `anhang_iv`, `anhang_v`, `anhang_x`)
- UN-Regelung Nr. 13 in der Fassung des ABl. L 42 vom 18.02.2016 (11. Änderungsserie, Ergänzung 13). Das ist der heute über § 41 Abs. 18 StVZO maßgebliche Text: https://lexaris.de/book/version/documentflat/head/2046952
- VO (EU) 582/2011 Anhang XIII (verweist für das Aufforderungssystem auf UN-R 49 Anhang 11): https://www.legislation.gov.uk/eur/2011/582/annex/XIII
- DGUV Vorschrift 70 § 36: https://vorschriften.bgn-branchenwissen.de/daten/dguv/70/36.htm
- DGUV Grundsatz 314-002 Nr. 2: https://vorschriften.bgn-branchenwissen.de/daten/dguv/314_002/2.htm
- eurotransport:
  - „Die Bremsanlage: Retter in der Not“: https://www.eurotransport.de/fahrzeuge/lkw/die-bremsanlage-retter-in-der-not/
  - „Die Bremsanlage: Anker und Hilfsbremser“: https://www.eurotransport.de/fahrzeuge/lkw/die-bremsanlage-anker-und-hilfsbremser/
  - „ZF-Intarder: Feste Größe“: https://www.eurotransport.de/fahrzeuge/lkw/zf-intarder-feste-groesse/
  - „Bremsmoment: Der Retarder des neuen Actros“: https://www.eurotransport.de/fahrer/bkf-news/bremsmoment-der-retarder-des-neuen-actros/
  - „Adblue-Mangel: Euro-6-Fahrzeuge gehen in den Kriechgang“: https://www.eurotransport.de/fahrzeuge/lkw/adblue-mangel-euro-6-fahrzeuge-gehen-in-den-kriechgang/
  - Knorr-Bremse, Kompressor mit Kupplung: https://www.eurotransport.de/fahrzeuge/lkw/fahrzeuge-knorr-bremse-iaa/
- auto motor und sport, „Warum zischt der Lkw …“ (Lösedruck Federspeicher): https://www.auto-motor-und-sport.de/nutzfahrzeug/warum-zischt-lkw-bus-druckluftbremse/
- autozeitung, eActros-Fahrbericht (Rekuperation), über WebFetch: https://www.autozeitung.de/neuer-mercedes-e-actros-2024-fahrbericht-206554.html
- kfz-tech.de, Mehrkreisschutzventil: https://www.kfz-tech.de/Engl/Buchprojekte/DLuftbremse/Mehrkreisschutzventil.htm
- VerkehrsRundschau zu OLG Düsseldorf: https://www.verkehrsrundschau.de/nachrichten/recht-geld/urteil-bremsprobe-im-rahmen-der-abfahrtskontrolle-genuegt-2998669
- Spielfeldmaße: https://www.bundesliga.com/de/faq/spielbetrieb/das-fussballfeld-groesse-markierungen-praxis-22369
- Prüfungsfragen (Nummer, Text und markierte Lösung): `https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-231/` und analog für 2-7-01, 2-7-02, 2-7-03, 2-7-08 und 2-2/2-2-23

**Nicht erreichbar oder nicht belegbar**
- **EUR-Lex:** Antwort leer (HTTP 202), auch über WebFetch. Deshalb habe ich UN-R 13 in der ABl.-Fassung über lexaris.de und die RL 71/320 über gesetze.legal gelesen.
- **cummins.com** (Auspuffbremse, zitiert in der Notiz zu Folie 66): HTTP 403, nicht geprüft. Das Prinzip ist Lehrbuchwissen.
- **umwelt-online:** Fehlerseite.
- **UN-R 49 Anhang 11:** nicht im Original gelesen. Die 20 km/h im Kriechmodus sind nur über eurotransport belegt.
- **Klassenzuordnung der Prüfungsfragen:** Keine frei zugängliche Quelle nennt die Klassenkennzeichen je Frage. autovio und fahrschule.de zeigen keine Klassen, clickclickdrive antwortet mit 403. Ob eine Frage im C-Bogen vorkommt, kann ich deshalb **nicht belegen**. Die Nummern legen nur eine Gruppierung nahe: -3xx sind Anhängerfragen, -4xx gehören zur Zugmaschinen-Gruppe.
- **Lösungen:** Sie stammen aus der autovio-Markierung und sind nicht mit dem TÜV|DEKRA-Original abgeglichen.

---

## 2. Ergebnis: 0 Fehler, 9 Hinweise, 25 Verbesserungen

Keine Aussage ist am Prüftag sachlich falsch oder veraltet. Der Fehler der ersten Prüfung (Frostschutzmittel) ist korrekt behoben. Alle Beträge, Punkte, Fristen und Quiz-Lösungen stimmen.

Die wichtigsten Punkte:
- **H1:** Der Rahmenplan-Punkt C6 e) „Geschwindigkeitsregler“ (Tempomat und AGR) fehlt ganz.
- **H2:** Die Aussage zum Retarder im kleinen Gang ist zu pauschal.
- **H3:** Bei den Tempo-Grenzen fehlt die Einschränkung aus § 3 Abs. 3 Satz 2 StVO.
- **H4–H6:** Drei Punkte der ersten Prüfung sind noch offen (Kompressor „immer“, ABS-Punkt in der Abfahrtkontrolle, Einbauschild des Begrenzers).
- **V1–V3:** Drei Quiz-Folien weichen vom amtlichen Text ab.

---

## 3. Umsetzung der ersten Prüfung (Teil a)

| Punkt erste Prüfung | Folie alt → neu | Status | Bemerkung |
|---|---|---|---|
| F1 Frostschutzmittel „nie“ | 22/11/49 → 33/11/60 | umgesetzt | „Bei Lufttrockner kein Frostschutzmittel“ – richtig (DGUV 314-002 Nr. 2.3.2: „Der Frostschützer, falls vorhanden …“). |
| H1 Dauerbremse und 44 % nach EU-Recht | 6/53 → 6/64 | umgesetzt | 💡-Notizen auf Folie 6 und 64. Das Prüfverfahren Typ IIA gilt für N3, die O4 ziehen dürfen (UN-R 13 Anh. 4 Nr. 1.8.1.2) – richtig. |
| H2 „nicht genug Luft zum Bremsen“ | 16 → 19 | umgesetzt | „… reicht noch nicht für mehrere kräftige Bremsungen“. |
| H3 Warnregel 4 + 1 | 17 → 22 | umgesetzt | Wortlaut passt zu UN-R 13 Nr. 5.2.1.13.1. |
| H4 Füllzeit bei Nenndrehzahl | 18 → 26 | umgesetzt | – |
| H5 Fragen-Nummern -4xx/-3xx | 9/23 → 9/34, 32, 39, 54, 92 | weitgehend umgesetzt | „(CE-Teil)“ und „Lastzug-Frage“ ergänzt. Bei 2.7.06-406 ist die Nummer entfernt, „Prüfungswissen“ steht aber noch da → V14. |
| H6 Kompressor „läuft immer mit“ | 9/10 → 9 | **nicht umgesetzt** | → H4 (jetzt mit Herstellerbeleg). |
| H7 „Jeder Kreis hat eigenen Behälter“ | 13 → 13 | **nicht umgesetzt** | → V13 (kein Primärbeleg gefunden). |
| H8 „bei guter Bremse 49 m“ | 62 → 81/82 | umgesetzt | – |
| H9 „Anhalteweg etwa 95 m“ | 63 → 83 | **nicht umgesetzt** | → V5. |
| H10 Abfahrtkontrolle | 75 → 108 | teilweise | Druckwarnung umgesetzt. Der ABS-Punkt fehlt weiter → H5. |
| H11 Einbauschild, Anlässe nur digital | 86 → 119 | teilweise | „beim digitalen Gerät“ umgesetzt. Der Ort beim Begrenzer ist noch unscharf → H6. |
| H12 HU/SP-Fristen | 87/91 → 114/120/124 | umgesetzt | Tabelle auf Folie 114 richtig. Formulierung auf Folie 120 → H8. |
| H13 Ablenker 1,2/1,5 bar | 89 → 122 | umgesetzt | – |
| H14 kleiner Gang, Retarder stärker | 60 → 71 | **nicht umgesetzt** | → H2. |
| H15 Primärretarder bei wenig Tempo | 58 → 69 | **nicht umgesetzt** | → H2. |

---

## 4. Befunde (Teil b)

F = sachlich falsch oder veraltet · H = ungenau, missverständlich, fehlende Einschränkung · V = Verbesserung (Sprache, Didaktik, Klarheit)

### Hinweise

| Nr. | Folie(n) | Wörtliches Zitat | Problem | Beleg (Wortlaut + URL) | Neuer Wortlaut (zum Einsetzen) |
|---|---|---|---|---|---|
| H1 | 62, 117–120 (Kapitel 06) | F 62: „06 \| Begrenzer und Fahrtenschreiber  90 km/h, Einbauschild, Prüfungen \| 10 Min“ | **Rahmenplan-Lücke.** Anlage 2.3 Nr. 6 verlangt „e) Geschwindigkeitsregler“. Der Geschwindigkeitsbegrenzer steht dort gesondert unter Nr. 8 c). Im Fragenkatalog heißt der Tempomat „Geschwindigkeitsregler (Tempomat)“, Kapitel 2.7.06 „Bremsanlagen und Geschwindigkeitsregler“. Tempomat und Abstandstempomat (AGR) werden in keinem Abend behandelt (grep über alle ABEND-Dateien: „Tempomat“ nur nebenbei in Abend 2, 5 und 7). Die Fragen 2.7.06-206, -240, -241 (sowie -110 bis -115) kommen nicht vor. | FahrschAusbO Anl. 2.3: „6. Lkw-Bremsen und Fahrzeuguntersuchungen; Geschwindigkeitsregler … e) Geschwindigkeitsregler.“ / „8. … c) Geschwindigkeitsbegrenzer“ – https://www.gesetze-im-internet.de/fahrschausbo_2012/anlage_2_3.html · 2.7.06-206 „Wann sollte der Geschwindigkeitsregler (Tempomat) benutzt werden?“ – richtig: „Wenn die Verkehrsverhältnisse eine gleichbleibende Geschwindigkeit zulassen“ · 2.7.06-240: richtig „Der Fahrer wird bei der Einhaltung des gewählten Abstands unterstützt“, falsch „Die Unterschreitung des Sicherheitsabstands ist ausgeschlossen“ – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-206/ | Neue Folie nach Folie 118, Titel **„Tempomat und Abstandstempomat“**:<br>• „Tempomat: hält das Tempo – nur wenn der Verkehr gleichmäßiges Fahren zulässt. Rechtzeitig aus: vor Kurven, beim Auffahren, vor Tempolimits.“<br>• „Abstandstempomat (AGR): hält Tempo und gewählten Abstand, bremst selbst – den Sicherheitsabstand garantiert er nicht. Gut auf Autobahn und Kraftfahrstraße.“<br>• „Ihr bleibt verantwortlich: Regen und Schnee stören den Sensor, Gas oder Bremse übersteuern.“<br>Kapitel 06 umbenennen: „Begrenzer, Tempomat, Fahrtenschreiber“. Notiz: Fragen 2.7.06-110 bis -115, -206, -240, -241. |
| H2 | 71 (Folientext), 69 (Folientext, Notiz) | F 71: „Erst die Geschwindigkeit mit der Betriebsbremse verringern, dann herunterschalten – im kleinen Gang bremsen Motor und Retarder stärker (Prüfungsfrage 2.7.06-236).“ · F 69: „Primär-retarder \| wirkt auch bei wenig Tempo“ | Der häufige **Sekundärretarder** (ZF-Intarder, Mercedes-Wasserretarder) sitzt hinter dem Getriebe. Seine Bremskraft hängt vom Tempo ab, nicht vom Gang. Im kleinen Gang bremst vor allem der **Motor** stärker. Der Primärretarder wirkt bei wenig Tempo nur, wenn der Motor hoch dreht. Das war schon Hinweis 14/15 der ersten Prüfung und ist nicht umgesetzt. | eurotransport „ZF-Intarder“: „Deshalb arbeitet der Sekundärretarder unabhängig von der Motordrehzahl und desto effektiver, je höher die Geschwindigkeit des Fahrzeugs ist.“ – https://www.eurotransport.de/fahrzeuge/lkw/zf-intarder-feste-groesse/ · eurotransport Actros: „Bei niedrigen Geschwindigkeiten dreht die Kardanwelle naturgemäß sehr langsam: Ein Sekundärretarder kann somit wenig ausrichten. Fallen aber niedrige Geschwindigkeit und hohe Motordrehzahl zusammen, dann ist der Primärretarder in seinem Element“ – https://www.eurotransport.de/fahrer/bkf-news/bremsmoment-der-retarder-des-neuen-actros/ | F 71: „Erst mit der Betriebsbremse langsamer werden, dann herunterschalten – im kleinen Gang bremst vor allem der Motor stärker (Prüfungsfrage 2.7.06-236).“<br>F 69: „Primär-retarder \| wirkt auch langsam – bei hoher Motordrehzahl“<br>Notiz 69 ergänzen: „Sekundärretarder: Bremskraft hängt vom Tempo ab, nicht vom Gang.“ |
| H3 | 118 (Folie + Notiz), 124 | F 118: „Kann 90 – darf 80“ · „Erlaubt ist weniger: / Autobahn 80 km/h – außerorts über 7,5 t nur 60 km/h.“ · F 124: „Begrenzer 90 km/h, erlaubt 80.“ | Die 60 km/h gelten **nicht** auf Autobahnen, nicht auf Straßen mit Mittelstreifen und nicht auf Straßen mit zwei markierten Fahrstreifen je Richtung. „erlaubt 80“ ohne Ortsangabe ist zu absolut: Auf der Landstraße über 7,5 t gelten 60 km/h, innerorts 50 km/h. | § 3 Abs. 3 StVO: „Diese Geschwindigkeitsbeschränkung gilt nicht auf Autobahnen (Zeichen 330.1) sowie auf anderen Straßen mit Fahrbahnen für eine Richtung, die durch Mittelstreifen oder sonstige bauliche Einrichtungen getrennt sind. Sie gilt ferner nicht auf Straßen, die mindestens zwei … markierte Fahrstreifen für jede Richtung haben.“ – https://www.gesetze-im-internet.de/stvo_2013/__3.html · § 18 Abs. 5: „… auf Kraftfahrstraßen mit Fahrbahnen für eine Richtung, die durch Mittelstreifen … getrennt sind, … für a) Kraftfahrzeuge mit einer zulässigen Gesamtmasse von mehr als 3,5 t … 80 km/h“ – https://www.gesetze-im-internet.de/stvo_2013/__18.html | F 118: „Erlaubt ist weniger: / Autobahn 80 km/h – Landstraße über 7,5 t: 60 km/h.“<br>Notiz 118 ergänzen: „60 km/h gelten nicht auf Straßen mit Mittelstreifen oder zwei Fahrstreifen je Richtung (§ 3 Abs. 3 Satz 2 StVO).“<br>F 124: „Begrenzer 90 km/h – auf der Autobahn höchstens 80.“ |
| H4 | 9 (Notiz) | „Er läuft immer mit, wenn der Motor läuft.“ | Zu absolut. Kompressoren **mit Kupplung** werden bei vollem Vorrat ganz vom Motor getrennt. Das war schon Hinweis 6 der ersten Prüfung und ist nicht umgesetzt. | eurotransport (Knorr-Bremse): „Ist das Bremssystem mit Luft aufgefüllt, kann der Kompressor mittels der Kupplung vollständig vom Motortrieb abgekuppelt werden, während die heute noch übliche Applikation den Kompressor ohne Gegendruck weiter betreibt.“ / „Der Kompressor mit Kupplung von Knorr-Bremse kommt 2009 auf den Markt.“ – https://www.eurotransport.de/fahrzeuge/lkw/fahrzeuge-knorr-bremse-iaa/ | „Er wird vom Motor angetrieben. Ist der Vorrat voll, läuft er leer mit – bei neueren Lkw wird er abgekuppelt.“ |
| H5 | 108 (Folie), 124 | F 108: „Dicht?:  kein Zischen, Druck fällt nicht ab“. Ein ABS-Punkt fehlt in der Liste. | (1) DGUV 314-002 nennt bei der Druckluftbremse auch die ABS-Kontrolleinrichtung. Das war schon Hinweis 10 der ersten Prüfung, der zweite Teil ist nicht umgesetzt. (2) „Druck fällt nicht ab“ ist zu absolut: Ein kleiner Abfall ist normal. Die eigene Notiz auf Folie 109 verweist für die Werte auf die Betriebsanleitung. | DGUV G 314-002 Nr. 2.3.2: „Die Gesamtanlage ist dicht; der maximale Vorratsdruck wird erreicht. Prüfung siehe Betriebsanleitung … Die ABV-/ABS-Kontrolleinrichtung zeigt keine Störung an.“ – https://vorschriften.bgn-branchenwissen.de/daten/dguv/314_002/2.htm | F 108: „Dicht: kein Zischen, Druck hält (Werte: Betriebsanleitung)“ + neue Zeile „ABS-Leuchte: nach dem Start aus – keine Störung“ (dann 6 Klicks).<br>F 124: „Vor jeder Schicht: Druck, Dichtheit, Druckwarnung, ABS-Leuchte, Bremsprobe.“ |
| H6 | 119 (Folie) | „Einbauschild:  plombiert am Gerät oder an der B-Säule auf der Fahrerseite – zeigt die letzte Prüfung.“ | Die Folie behandelt Fahrtenschreiber **und** Begrenzer. Für den Begrenzer ist nur die B-Säule erlaubt (ohne B-Säule: Türrahmen). „Am Gerät“ gilt nur für das Fahrtenschreiber-Schild. | § 57d Abs. 2: „… an der B-Säule der Fahrerseite gut sichtbar und dauerhaft ein Einbauschild anzubringen … Dieses Einbauschild kann mit dem Einbauschild nach § 57b kombiniert werden.“ – https://www.gesetze-im-internet.de/stvzo_2012/__57d.html · § 57b Abs. 1: „… auf oder neben dem Fahrtenschreiber oder an der B-Säule der Fahrerseite …“ – https://www.gesetze-im-internet.de/stvzo_2012/__57b.html | „Einbauschild: plombiert an der B-Säule Fahrerseite (Tacho-Schild auch am Gerät) – zeigt die letzte Prüfung.“ |
| H7 | 115 (Folie, Notiz) | „Geringe Mängel:  Plakette gibt es – Mängel innerhalb eines Monats beheben.“ | Zu absolut. Der Prüfer „kann“ die Plakette zuteilen. Bei einer HU mit nachgeholter SP (Nr. 3.1.3) ist das nicht möglich. Die Mängel sind „unverzüglich“ zu beheben, der eine Monat ist nur die Höchstfrist. | Anlage VIII Nr. 3.1.4.1: „Er kann für das Fahrzeug, außer bei Untersuchungen nach Nummer 3.1.3, eine Prüfplakette … zuteilen; der Halter hat die Mängel unverzüglich, spätestens jedoch innerhalb eines Monats, beheben zu lassen“ – https://www.gesetze-im-internet.de/stvzo_2012/anlage_viii.html | „Geringe Mängel: Plakette meist trotzdem – Mängel sofort, spätestens in einem Monat beheben.“ |
| H8 | 120 (Mitschreib-Folie) | „HU / SP \| HU jedes Jahr – über 7,5 t dazu SP alle 6 Monate (ab 3. bzw. 4. Jahr)“ | Neben „HU jedes Jahr“ kann „SP alle 6 Monate“ als zwei SP pro Jahr gelesen werden. Tatsächlich liegt die SP 6 Monate nach jeder HU, also einmal im Jahr in der Mitte. Bei „ab 3. bzw. 4. Jahr“ fehlt die Zuordnung zu den Gewichtsklassen. Da die Schüler diese Zeile abschreiben, ist das wichtig. | Anlage VIII Nr. 2.1: „… die Zeitabstände für Sicherheitsprüfungen beziehen sich hierbei auf die zuletzt durchgeführte Hauptuntersuchung“. Tabelle 2.1.4.3/2.1.4.4: keine SP in den ersten 36 bzw. 24 Monaten – https://www.gesetze-im-internet.de/stvzo_2012/anlage_viii.html | „HU jedes Jahr – dazwischen SP: über 12 t ab dem 3., über 7,5 t ab dem 4. Jahr“ |
| H9 | 108 (Notiz) | „✅ Rechtsprechung (OLG Düsseldorf, 28.01.2014): Bei der Abfahrtkontrolle genügt eine Bremsprobe – Risse in den Bremsscheiben durch die Felgen suchen muss der Fahrer nicht.“ | Die Einschränkung des Gerichts fehlt. Die Bremsprobe genügt nur, wenn es keine Hinweise auf Schäden gibt. Das Aktenzeichen fehlt. | VerkehrsRundschau, 20.10.2014: „Soweit es keine weiteren Anhaltspunkte für Schäden gebe, sei dies ausreichend.“ – Aktenzeichen IV-3 RBs 11/14 – https://www.verkehrsrundschau.de/nachrichten/recht-geld/urteil-bremsprobe-im-rahmen-der-abfahrtskontrolle-genuegt-2998669 | „✅ OLG Düsseldorf, 28.01.2014, IV-3 RBs 11/14: Gibt es keine Hinweise auf Schäden, genügt bei der Abfahrtkontrolle die Bremsprobe – durch die Felgen nach Rissen suchen muss der Fahrer nicht.“ |

### Verbesserungen

| Nr. | Folie(n) | Wörtliches Zitat | Problem | Beleg (Wortlaut + URL) | Neuer Wortlaut (zum Einsetzen) |
|---|---|---|---|---|---|
| V1 | 58 (Quiz) | „C \| Durch Bremsflüssigkeit“ | Diesen Ablenker gibt es amtlich nicht. Die Folie verweist aber auf 2.7.06-213, Schüler halten sie also für die Prüfungsfrage. | 2.7.06-213: richtig „Durch Federkraft“; falsch „Durch einströmende Druckluft“, „Durch die Betätigungskraft des Fahrers“ – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-213/ | „A \| Durch einströmende Druckluft · B \| Durch Federkraft · C \| Durch die Betätigungskraft des Fahrers“ |
| V2 | 57 (Quiz) | „Der Lkw stand mehrere Tage. Wann dürfen Sie frühestens losfahren?“ · „A \| Sobald sich die Feststellbremse lösen lässt“ | Der amtliche Ablenker lautet „… automatisch löst“. „Lösen lässt“ passt zur Animation, die Schüler erkennen die Frage aber schlechter wieder. | 2.7.01-238: „Ein Kraftfahrzeug mit Druckluftbremsanlage war mehrere Tage nicht in Betrieb. Wann dürfen Sie frühestens losfahren (Fahrzeug voll ausgelastet)?“ – richtig „Wenn die Signale der Druckwarneinrichtung aufgehört haben“; falsch „Sobald sich die Federspeicherbremse automatisch löst“, „Wenn ein Vorratsdruck von 3 bar angezeigt wird“ – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-01/2-7-01-238/ | „Ihr Lkw mit Druckluftbremse stand mehrere Tage. Wann dürfen Sie frühestens losfahren?“ · „A \| Sobald sich die Federspeicherbremse automatisch löst“ · „B \| Wenn die Signale der Druckwarneinrichtung aufgehört haben“ · „C \| Wenn 3 bar Vorratsdruck angezeigt werden“ |
| V3 | 71 (Quiz) | „Starkes Gefälle: Trotz Dauerbremse wird der Lkw immer schneller. Was tun?“ · „A \| In einen höheren Gang schalten“ · „C \| Die Dauerbremse ausschalten, damit sie nicht überhitzt“ | Die amtliche Voraussetzung „beladen, manuelles Schaltgetriebe“ fehlt. Bei Automatik schaltet das Getriebe selbst zurück. Die Ablenker weichen ab. | 2.7.06-236: „Sie fahren ein beladenes Kraftfahrzeug mit manuellem Schaltgetriebe. Auf einem starken Gefälle nimmt die Geschwindigkeit trotz eingeschalteter Dauerbremse kontinuierlich zu. Was sollten Sie tun?“ – falsch: „Ich bremse mit der Betriebsbremse ab und schalte in einen höheren Gang“, „Ich schalte die Dauerbremse aus und nutze nur die Betriebsbremse“ – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-236/ | „Beladener Lkw mit Schaltgetriebe, starkes Gefälle: Trotz Dauerbremse wird er immer schneller. Was tun?“ · „A \| Mit der Betriebsbremse abbremsen und hochschalten“ · „C \| Dauerbremse aus, nur noch Betriebsbremse“ |
| V4 | 55, 59, 123 (Quiz) | F 55: „Unterlegkeil an ein Hinterrad legen“ · F 59: „Fading“, „Bruch mehrerer Federblätter“ · F 123: „Pedal mehrmals kurz treten (pumpen)“ | Kleine Abweichungen vom amtlichen Text. Inhaltlich sind alle Lösungen richtig. | 2.2.23-201: „Unterlegkeil vor ein Hinterrad legen“ · 2.7.06-209: „Starkes Bremsfading“, „Bruch mehrerer Federblätter an der Hinterachse“ · 2.7.01-139: „Ich betätige die Bremse – mehrfach in kurzen Abständen mit maximaler Pedalkraft“ – autovio (s. o.) | F 55: „Unterlegkeil vor ein Hinterrad legen“ · F 59: „Starkes Bremsfading“ / „Bruch mehrerer Federblätter an der Hinterachse“ · F 123: „Mehrmals kurz hintereinander mit voller Kraft treten (pumpen)“ |
| V5 | 83, 81, 78 | F 83: „Anhalteweg etwa 95 m“ (Balken 22 + 13 + 59) · F 81: „Etwa 85 Meter“ neben „gefahren: 84 m“ · F 78: „60 km/h … gefahren: 56 m“ | Nachgerechnet:<br>• Gefälle: 22,2 + 13,3 + 58,5 = 94,1 m. Die Summe der Balken ist 94. (Hinweis 9 der ersten Prüfung, nicht umgesetzt.)<br>• Eben: 84,9 m. Der Zähler zeigt am Ende 84, die Antwort sagt 85.<br>• Bei 60 km/h sind 57,2 m gefahren, der Zähler zeigt 56. | Eigene Rechnung: v = 22,22 m/s; a = 5,0 m/s²; Gefälle 8 %: 9,81 · sin(arctan 0,08) = 0,78 m/s², also a = 4,22 m/s². Bremsweg bis 60 km/h: (22,22² − 16,67²)/10 = 21,6 m | F 83: „Anhalteweg etwa 94 m“ · F 81: Endstand „gefahren: 85 m“ · F 78: „gefahren: 57 m“ |
| V6 | 76/77/82 (Notizen) | Notiz 77: „✅ § 41 Abs. 12 StVZO: Ansprech- und Schwellzeit höchstens 0,6 s.“ · Notiz 82: „5,0 m/s² (Mindestwert nach § 41 Abs. 4 StVZO) und 0,6 s … (§ 41 Abs. 12)“ | (1) § 41 Abs. 12 Satz 3 ist eine Messregel. Nach Abs. 18 gilt er – wie Abs. 4 – für Lkw über 25 km/h nicht. Maßgeblich ist UN-R 13. Die Werte sind gleich (0,6 s, 5,0 m/s²), nur die Quelle ist ungenau.<br>(2) Die Rechnung nimmt an, dass in den 0,6 s noch gar nicht gebremst wird. Das ist die vorsichtige Annahme. Baut sich die Bremswirkung gleichmäßig auf, ergeben sich etwa 78 statt 85 m. | § 41 Abs. 18: „Abweichend von den Absätzen 1 bis 11, 12 Satz 1, 2, 3 und 5 … müssen … Lastkraftwagen … den im Anhang … genannten Bestimmungen … entsprechen.“ – https://www.gesetze-im-internet.de/stvzo_2012/__41.html · UN-R 13 Anh. 6 Nr. 2.4: „… pressure in the brake cylinder reaches 75 per cent of its asymptotic value shall not exceed 0,6 second.“ · RL 71/320 Anh. II: N3, Typ 0 „dm ≥ 5 m/s²“ – https://lexaris.de/book/version/documentflat/head/2046952 | Notiz 77: „✅ EU-/UN-Bremsenrecht (UN-R 13 Anhang 6): Spätestens 0,6 s nach dem Treten muss im Bremszylinder 75 % des Drucks anliegen. Vorsichtige Rechnung: Wir tun so, als ob in dieser Zeit noch nichts bremst.“<br>Notiz 82: „… 5,0 m/s² (Mindestwert für schwere Lkw, UN-R 13) …“ |
| V7 | 81 | „Etwa 85 Meter – fast eine ganze Fußballfeld-Länge.“ | Ein Spielfeld ist meist 105 m lang (erlaubt 90–120 m). 85 m sind etwa vier Fünftel davon, „fast ganz“ übertreibt. | bundesliga.com: übliche Länge 105 m, Seitenlinie 90–120 m – https://www.bundesliga.com/de/faq/spielbetrieb/das-fussballfeld-groesse-markierungen-praxis-22369 | „Etwa 85 Meter – gut drei Viertel eines Fußballfelds.“ |
| V8 | 6, 64, 69 | F 6: „Dauerbremse \| Hebel am Lenkrad \| Motorbremse oder Retarder – verschleißfrei …“ | Die Folien sind nicht ganz aktuell: E-Lkw bremsen bergab über **Rekuperation**. Die Bedienung läuft über denselben Lenkradhebel. Für Unterrichtsvideos, die mehrere Jahre laufen, lohnt ein Satz dazu. | autozeitung (eActros 600): „Geregelt wird das genau wie bis dato die Retarder genannte Motorbremse mit einem Hebel am Lenkrad.“ – https://www.autozeitung.de/neuer-mercedes-e-actros-2024-fahrbericht-206554.html · § 41 Abs. 15: „Als Dauerbremsen gelten Motorbremsen oder in der Bremswirkung gleichartige Einrichtungen.“ | Notiz 69 ergänzen: „💡 E-Lkw: Der Elektromotor bremst als Generator (Rekuperation) – bedient wie der Retarder über den Hebel am Lenkrad.“ |
| V9 | 68 (Folie „4 \| Drehzahl hoch halten“) | „Je höher die Drehzahl, desto stärker bremst der Motor. Darum vor dem Gefälle zurückschalten.“ | Eine Grenze fehlt: Der Motor darf nicht überdreht werden. Sonst lernen Schüler „je höher, desto besser“. | Lehrbuchwissen und Drehzahlmesser-Farbbereiche (Abend 2, Folie 45 „Zu hoch gedreht“) | „Je höher die Drehzahl, desto stärker bremst der Motor – aber nie in den roten Bereich. Darum vor dem Gefälle zurückschalten.“ |
| V10 | 35 | „Bremsflüssigkeit nach Vorgabe wechseln – sie zieht Wasser. Pedal fällt durch: sofort abstellen.“ | Rahmenplan C5 a) „hydraulische Bremsanlage“: Die Kontrolle vor Fahrtantritt fehlt. Sie ist in DGUV 314-002 Nr. 2.3.1 eigens genannt. | DGUV G 314-002 Nr. 2.3.1: „Der Bremsflüssigkeitsstand ist ausreichend. Das hydraulische Bremssystem ist dicht: Anhaltendes Niedertreten des Bremspedals führt nicht zum Nachgeben des Pedals.“ – https://vorschriften.bgn-branchenwissen.de/daten/dguv/314_002/2.htm | Notiz 35 ergänzen: „Abfahrtkontrolle Hydraulik: Stand der Bremsflüssigkeit prüfen; Pedal länger fest treten – es darf nicht nachgeben (DGUV 314-002 Nr. 2.3.1).“ |
| V11 | 46 (Notiz) | „EBS ist kein Notbremsassistent.“ | Hier passt die Prüfungsaussage zum Notbremsassistenten (Kapitel 2.7.06, also Bremsen-Lektion), die in Abend 3 fehlt. | 2.7.06-237/-238: „Der Notbremsassistent sollte – immer aktiviert sein“ · 2.7.06-242: richtig „Weil die Funktion des Radarsensors durch Schnee beeinträchtigt ist“, „… durch einen Unfallschaden verändert hat“ – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-237/ | Notiz 46 ergänzen: „✅ 2.7.06-237/-238: Notbremsassistent immer eingeschaltet lassen. 2.7.06-242: Er kann sich abschalten, z. B. bei Schnee auf dem Radarsensor oder verstellten Sensoren nach einem Unfall.“ |
| V12 | 36, 55, 57–59, 71, 121–123 (Quiz) | „Frage vorlesen, abstimmen.“ | Rechtlicher Rahmen der Quizfolien: Lernkontrollen sind Pflicht, Prüfungsbogen ausfüllen ist im Pflichtunterricht verboten. Das gemeinsame Abstimmen ist in Ordnung. Außerdem: Aufgezeichnete Videos ersetzen den Präsenzunterricht nicht. | FahrschAusbO § 4 Abs. 1a: „Zur Ergebnissicherung sind Lernkontrollen einzusetzen; das Ausfüllen von Testbogen nach Art der Prüfungsbogen auch mithilfe digitaler Medien darf nicht Gegenstand des theoretischen Mindestunterrichts sein.“ · Abs. 1b: „Der theoretische Unterricht setzt die physische Präsenz der Fahrschüler voraus … Der digitale Unterricht ist synchron durchzuführen“ – https://www.gesetze-im-internet.de/fahrschausbo_2012/__4.html | Quiz-Notizen ergänzen: „Mündlich abstimmen und begründen – kein Bogen zum Ausfüllen.“ Titel „Quiz“ ggf. in „Kurz-Check“ ändern. |
| V13 | 13 (Folie, Notiz) | „Jeder Kreis hat seinen eigenen Vorratsbehälter – unten mit einem Ventil zum Entwässern.“ | Hinweis 7 der ersten Prüfung, nicht umgesetzt. Ich habe **keinen Primärbeleg** gefunden, dass Kreis 4 oft ohne eigenen Behälter auskommt. „Bremskreis“ ist trotzdem genauer, weil Kreis 4 nicht bremst. | Nicht belegt. eurotransport spricht von „Vorratsbehälter für die Vorderachsbremse“ (Kreise 1/2): https://www.eurotransport.de/fahrzeuge/lkw/die-bremsanlage-retter-in-der-not/ | „Jeder Bremskreis hat seinen eigenen Vorratsbehälter – unten mit einem Ventil zum Entwässern.“ |
| V14 | 9 (Notiz), 34 | Notiz 9: „✅ Prüfungswissen: Am Luftpresser regelmäßig den Anschluss der Druckleitung und den Keilriemen kontrollieren.“ | Inhalt aus 2.7.06-406. Diese Frage steht in der -4xx-Gruppe zusammen mit 2.7.06-402 und -405 (land- und forstwirtschaftliche Zugmaschine, Auflaufbremse). Ob sie im C-Bogen vorkommt, ist nicht belegt. „Prüfungswissen“ verspricht zu viel. | 2.7.06-406 und Nachbarfragen – https://autovio.de/fuer-fahrschueler/fuehrerschein-theorie-lernen/2-7/2-7-06/2-7-06-406/ | Notiz 9: „✅ Fachwissen (Frage 2.7.06-406, Zugmaschinen-Teil): Am Luftpresser Druckleitungsanschluss und – falls vorhanden – Keilriemen kontrollieren.“ |
| V15 | 45 | „Ist die ALB defekt oder falsch eingestellt, blockieren die Hinterräder des leeren Lkw bei jeder stärkeren Bremsung.“ | Die Folie folgt der Prüfungsfrage. Lkw über 3,5 t müssen aber ABS haben, das ein Blockieren verhindert. Schüler könnten sonst denken, ALB und ABS widersprechen sich. | § 41b Abs. 2 Nr. 1 StVZO (ABV-Pflicht) – https://www.gesetze-im-internet.de/stvzo_2012/__41b.html · 2.7.06-209 | Notiz 45 ergänzen: „Mit ABS regelt das ABS dann ständig – das merkt ihr am Pulsieren. Ohne ABS blockieren die Räder.“ |
| V16 | 3 | „Auf den Antriebsachsen und den vorderen Lenkachsen, mit Alpine-Symbol.“ | Die StVO sagt „permanent angetriebene Achsen“. Eine zuschaltbare Antriebsachse ist nicht gemeint. | § 2 Abs. 3a StVO: „… wenn mindestens die Räder 1. der permanent angetriebenen Achsen und 2. der vorderen Lenkachsen mit Reifen ausgerüstet sind …“ – https://www.gesetze-im-internet.de/stvo_2013/__2.html | „Auf den ständig angetriebenen Achsen und den vorderen Lenkachsen, mit Alpine-Symbol.“ |
| V17 | 3 | „Drei Fragen von letztem Mal – wer weiß es noch?“ | Grammatik: „von letztem Mal“ ist umgangssprachlich, korrekt ist „vom letzten Mal“. | Standardsprache: Präposition + Artikel + Adjektiv | „Drei Fragen vom letzten Mal – wer weiß es noch?“ |
| V18 | 85 | „Die Bremse wirkt wie sie soll.“ | Komma fehlt vor dem Nebensatz „wie sie soll“. | Amtliches Regelwerk, § 74 (Nebensätze werden mit Komma abgegrenzt) | „Die Bremse wirkt, wie sie soll.“ |
| V19 | 124 | „Auf Glätte  Dauerbremse klein oder aus – nie voll in der Kurve.“ | Doppelpunkt fehlt. Die anderen vier Punkte haben einen („Bergab:“, „ABS:“ …). | – | „Auf Glätte: Dauerbremse klein oder aus – nie voll in der Kurve.“ |
| V20 | 64 | „Steigung zur Verdeutlichung überzeichnet“ | Die Folie zeigt ein Gefälle (7 %). „Steigung“ widerspricht dem Bild. | – | „Neigung zur Verdeutlichung überzeichnet“ |
| V21 | 67 | „Die Konstantdrossel öffnet ein kleines Ventil im Zylinder.“ | Die Notiz sagt richtig „im Zylinderkopf“. Folie und Notiz sind uneinheitlich. | Notiz 67: „Ein kleines Ventil im Zylinderkopf bleibt offen.“ | „Die Konstantdrossel öffnet ein kleines Ventil im Zylinderkopf.“ |
| V22 | 51 | „Die Löseschraube herausdrehen spannt die Feder von Hand.“ | Holpriger Satzbau: Ein Infinitiv steht als Subjekt. | – | „Mit der Löseschraube spannt ihr die Feder von Hand (herausdrehen).“ |
| V23 | 115 | „Erhebliche Mängel:  keine Plakette – nach der Reparatur Nachprüfung spätestens nach einem Monat.“ | „Spätestens nach einem Monat“ kann man als „frühestens/nach Ablauf“ missverstehen. Gemeint ist „innerhalb eines Monats“. | Anlage VIII Nr. 3.1.4.2: „… spätestens bis zum Ablauf von einem Monat nach dem Tag der Hauptuntersuchung wieder vorzuführen.“ | „Erhebliche Mängel: keine Plakette – reparieren und innerhalb eines Monats zur Nachprüfung.“ |
| V24 | 60, 124 (Folie) gegenüber Notizen 59, 123 | Folie: „Das nimmst du mit“ · Notiz: „Das nehmt ihr mit.“ | Die Anrede ist uneinheitlich: Auf den Folien steht „du“, sonst „ihr“, im Quiz „Sie“ (Prüfungsstil). | – | Folie 60 und 124: „Das nehmt ihr mit“ |
| V25 | Notizen 44, 114, 95 | N 44: „… oder bei Luftfederung über den Balgdruck … ✅ eurotransport, „Die Bremsanlage: Retter in der Not“.“ · N 114: „✅ StVZO Anlage VIII Nr. 2.1: … SP darf einen Monat früher gemacht werden …“ · N 95: „Frage auf der Folie: „Kann der Lkw noch ausweichen?““ | Quellen und Zitate präzisieren:<br>• 44: Der Artikel nennt nur „Abstand zwischen dem Fahrgestellrahmen und der Achse“, den Balgdruck nicht.<br>• 114: Die Regel „einen Monat früher“ steht in Nr. 2.4, nicht in Nr. 2.1.<br>• 95: Auf der Folie steht „kann der Lkw noch am Auto vorbei?“. | eurotransport „Retter in der Not“ (s. o.) · Anlage VIII Nr. 2.4: „Die Sicherheitsprüfung darf in dem unmittelbar vor dem … ausgewiesenen Monat durchgeführt werden, ohne dass sich die … Zeitabstände … ändern.“ | N 44: „… über den Balgdruck (Fachwissen) – eurotransport nennt den Abstand Rahmen–Achse.“ · N 114: „… (Anlage VIII Nr. 2.1 und 2.4).“ · N 95: „Frage auf der Folie: „Kann der Lkw noch am Auto vorbei?““ |

---

## 5. Ausdrücklich als richtig bestätigt

### Recht (Wortlaut am 03.10.2026 gelesen)
- **§ 41 StVZO:**
  - Abs. 1: zwei unabhängige Bremsanlagen, „von denen jede auch dann wirken kann, wenn die andere versagt“
  - Abs. 4: 5,0 m/s²
  - Abs. 4a: 44 %, „ohne dass das Kraftfahrzeug seine Spur verlässt“
  - Abs. 5: „ausschließlich durch mechanische Mittel“ und 1,5 m/s²
  - Abs. 15: Dauerbremse über 9 t, 7 % / 6 km / 30 km/h; Busse über 5,5 t
  - Abs. 18: Verweis auf EU-/UN-Recht für Lkw über 25 km/h
  - Folien 6, 53, 64; Notizen 6 und 64 mit richtiger EU-Einschränkung.
- **§ 41b:** ABV regelt den Schlupf; Pflicht für Lkw und Sattelzugmaschinen über 3,5 t mit mehr als 60 km/h (Folien 94, 105, 106).
- **§ 57b:**
  - Nachprüfung „mindestens einmal innerhalb von 24 Monaten“
  - unverzüglich nach Reparatur, nach Änderung der Wegdrehzahl oder des Reifenumfangs, nach Plombentausch
  - bei digitalen Geräten auch bei UTC-Abweichung über 20 Minuten und bei Kennzeichenwechsel
  - Halterpflicht
  - Folie 119; die Einschränkung „beim digitalen Gerät“ ist richtig umgesetzt.
- **§ 57c:** Pflicht für Lkw, Zugmaschinen und Sattelzugmaschinen über 3,5 t; „vset + Toleranzen ≤ 90 km/h“; Abs. 5 nicht abschaltbar (Folie 118).
- **§ 57d:** keine feste Frist; Prüfanlässe; Schild an der B-Säule, plombiert, mit Prüfdatum; mit dem Tacho-Schild kombinierbar (Folie 119, Notiz). Für den Ort des Schilds siehe H6.
- **§ 29:** Prüfplakette hinten (Abs. 2 Nr. 1), Prüfmarke mit SP-Schild (Abs. 2 Nr. 2), Bericht und Protokoll aufbewahren und aushändigen (Abs. 10) (Folie 115).
- **Anlage VIII:**
  - Nr. 2.1: HU 12 Monate ab über 3,5 t; SP 6 Monate, über 7,5–12 t nach 36 Monaten, über 12 t nach 24 Monaten. Die Tabelle auf Folie 114 stimmt (SP bei 3,5 bzw. 2,5 und 3,5 Jahren).
  - Nr. 2.4: SP-Frist ab der letzten HU; SP einen Monat früher erlaubt.
  - Nr. 3.1.1: HU nur durch aaSoP/PI; Nr. 3.2.2: SP auch in anerkannten Werkstätten.
  - Nr. 3.1.4.2–3.1.4.4: erhebliche, gefährliche und verkehrsunsichere Mängel (Folie 115; zu geringen Mängeln siehe H7).
- **Anlage VIIIa:** HU mit kurzer Fahrt ab 8 km/h; prüft Dauerbremse, ABV, Entwässerung, ALB, Fahrtschreiber und Geschwindigkeitsbegrenzer („die HU kontrolliert ihn mit“, Folie 119).
- **§ 34 StVZO:** 32 t für Kraftfahrzeuge mit mehr als drei Achsen (Folie 1, „bis zu 32 Tonnen“).
- **StVO:**
  - § 2 Abs. 3a mit § 36 Abs. 4 StVZO: Alpine-Symbol Pflicht, keine M+S-Übergangsregel mehr (Folie 3)
  - § 3 Abs. 3 Nr. 2: 80 km/h für 3,5–7,5 t, 60 km/h über 7,5 t (Ausnahmen siehe H3)
  - § 18 Abs. 5 Nr. 1: 80 km/h
  - § 23 Abs. 1 Satz 2: Fahrer sorgt für vorschriftsmäßigen Zustand (Folien 106, 118)
- **BKat (Stand 12.08.2026):**
  - 186.1.1–186.1.4: 15 / 25 / 60 / 75 €
  - 186.2.1–186.2.3: 15 / 25 / 60 €
  - 189.2.1: 270 €
  - 214.1: 180 €
  - 223: 100 €
  - 224: 150 €
  - Folien 116 und 118 richtig, auch „zahlt der Halter“ bei 186.
- **FeV Anlage 13** („mit einem Punkt“):
  - Nr. 3.5.1 → 186.1.3, 186.1.4, 186.2.3
  - Nr. 3.5.2 → 189.2.1
  - Nr. 3.5.8 → 214.1
  - Nr. 3.5.10 → 223, 224
- **FahrschAusbO § 4 Abs. 3 und 6:** Doppelstunde 90 Minuten, höchstens zwei Doppelstunden täglich. Die Zeitpläne auf den Folien 2, 4 und 62 ergeben je 90 Minuten (10+25+20+10+20+5 bzw. 20+15+10+15+15+10+5).
- **DGUV:**
  - Vorschrift 70 § 36: vor jeder Arbeitsschicht prüfen, Mängel melden, bei Gefahr Betrieb einstellen
  - Grundsatz 314-002 Nr. 2.3.2: entwässern, Trockner, dicht, maximaler Vorratsdruck, Druckwarnung, Bremsprobe; ABS-Punkt siehe H5
- **OLG Düsseldorf, 28.01.2014:** Datum und Kernaussage richtig; Einschränkung siehe H9.

### EU-/UN-Bremsenrecht (RL 71/320 und UN-R 13 in ABl.-Fassung – Werte gleich)
- **Warnregel 4 + 1:** UN-R 13 Nr. 5.2.1.13.1 (Folie 22).
- **Federspeicher:**
  - lösen beim Auffüllen erst, wenn die Hilfsbremswirkung erreicht ist (RL Anh. V Nr. 2.3) (Folie 19)
  - vorher Warnung (UN-R 13 Anh. 8 Nr. 2.6) (Folie 50)
  - Hilfslöseeinrichtung; nötiges Werkzeug wird im Fahrzeug mitgeführt (Anh. 8 Nr. 3.1, 3.2) (Folie 51)
  - abstufbar als Hilfsbremse (RL Anh. V Nr. 2.1) (Folie 53)
- **Feststellbremse:** 18 % beladen, Zug 12 % (UN-R 13 Anh. 4 Nr. 2.3.1, 2.3.2) (Folien 53, 54).
- **Füllzeit:** 3 bzw. 6 Minuten bis 65 % bei Nenn- bzw. Abregeldrehzahl (RL Anh. IV Nr. 2.3.1, 2.4.1) (Folie 26).
- **Ansprechzeit:** 0,6 s bis 75 % des Drucks (UN-R 13 Anh. 6 Nr. 2.4) (Folien 76/77; Quelle siehe V6).
- **Verzögerungen:** N3 Typ 0 ≥ 5,0 m/s²; Hilfsbremse 2,2 m/s² = 44 %.
- **Typ IIA:** 7 % / 6 km / 30 km/h nur mit Dauerbremse, Pflicht für N3, die O4 ziehen dürfen (UN-R 13 Anh. 4 Nr. 1.8) (Notiz 64).
- **Integrierte Dauerbremse:** braucht ein ABV, das auch auf die Dauerbremse wirkt (UN-R 13 Anh. 13 Nr. 4.6) (Notiz 70).
- **ABV-Warnsignal:** leuchtet beim Einschalten, muss vor 10 km/h ausgehen; Sensorprüfung über 10 km/h (RL Anh. X Nr. 4.1) (Folie 106).
- **AdBlue:** erst Leistungsminderung, dann Kriechmodus 20 km/h (eurotransport; VO 582/2011 Anh. XIII → UN-R 49 Anh. 11) (Folie 3).

### Technik und Rechnungen
- **Anhalteweg 80 km/h:** 22,2 + 13,3 + 49,4 = 84,9 m ≈ 85 m.
- **8 % Gefälle:** 0,78 m/s² weniger Verzögerung, Bremsweg 58,5 m, also „etwa 10 m länger“.
- **40 km/h:** 11,1 + 6,7 + 12,3 = 30,1 m; ein Viertel Bremsweg bei halbem Tempo.
- **Animation:** Zwischenstände 11 / 22 / 29 / 35 / 72 / 81 m passen (Abweichungen siehe V5).
- **Kreise und Ventile:**
  - Fremdkraftbremse; Kreiseinteilung 1/2 vorn/hinten, 3 Feststellbremse/Anhänger, 4 Dauerbremse/Nebenverbraucher
  - achsweise Aufteilung, damit der Lkw nicht schleudert
  - ALB über den Abstand Rahmen–Achse
  - Sicherungsdruck 6–7 bar, Schließdruck 4,5–6 bar
  - Quelle: eurotransport „Retter in der Not“ und „Anker und Hilfsbremser“
- **Federspeicher lösen** bei 5–7 bar (auto motor und sport).
- **Vierkreisschutzventil:** füllt zuerst die Kreise 1/2, der Federspeicher folgt später (kfz-tech) – passt zur Animation auf den Folien 15–26.
- **Retarder:** ZF-Intarder 4.000 Nm / 600 kW / „ungefähr 90 Prozent aller Bremsungen“; Actros-Wasserretarder 3.500 Nm (eurotransport).
- **Dichtheit:** Beispielwerte 12,0 → 11,4 bar (−0,6) bzw. 10,8 bar (−1,2) stimmen mit der 0,7-bar-Grenze.

### Prüfungsfragen (Nummer, Text und Lösung passen zur Aussage in der Notiz)
2.2.23-201 · 2.7.01-040 · 2.7.01-042 · 2.7.01-127 · 2.7.01-139 · 2.7.01-238 · 2.7.01-257 · 2.7.02-017 · 2.7.02-020 · 2.7.02-031 · 2.7.02-109 · 2.7.02-202 · 2.7.02-203 · 2.7.02-204 · 2.7.02-213 · 2.7.02-215 · 2.7.02-304 · 2.7.03-213 · 2.7.06-101 · 2.7.06-103 · 2.7.06-104 · 2.7.06-108 · 2.7.06-208 · 2.7.06-209 · 2.7.06-210 · 2.7.06-213 · 2.7.06-214 · 2.7.06-215 · 2.7.06-216 · 2.7.06-220 · 2.7.06-223 · 2.7.06-228 · 2.7.06-229 · 2.7.06-230 · 2.7.06-231 · 2.7.06-232 · 2.7.06-233 · 2.7.06-234 · 2.7.06-235 · 2.7.06-236 · 2.7.06-239 · 2.7.06-310 · 2.7.06-320 · 2.7.08-001 · 2.7.08-207 – zusätzlich abgerufen: 2.7.06-319, -321, -406, 2.7.08-208.

### Quiz-Lösungen (amtlich richtig markiert)
Folie 36 (B, C) · Folie 55 (A, B) · Folie 57 (B) · Folie 58 (B) · Folie 59 (A, C) · Folie 71 (B) · Folie 121 (A, C) · Folie 122 (A, Ablenker 1,2/1,5 bar jetzt amtlich) · Folie 123 (B). Abweichungen im Wortlaut siehe V1–V4.

### Form
- Die Klickzahlen passen zu den Folienelementen (z. B. Folie 56 und 120: je 8 Zeilen und 8 Klicks; Folie 108: 5 Klicks – bei H5 werden es 6).
- Die Anführungszeichen „…“ sind durchgehend deutsch und ausgeglichen (201 öffnende, 201 schließende).
- Die Begriffe sind einheitlich eingeführt: Luftpresser/Kompressor, ABV/ABS, Druckwarnung/Druckwarneinrichtung.
