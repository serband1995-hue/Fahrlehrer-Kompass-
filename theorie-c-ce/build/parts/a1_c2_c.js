// C2 Teil C: Fahrverbote (§ 30 StVO, FerReiseV), Mitfahrer (§ 21), Unterfahrschutz, Papiere, Maut, Abschluss
const { C, sec, base, kick, title, card, point, CLICK, ask, quiz, chapter, foot, write, takeaway, sign, svgImg } = require('../gs');
const { icon, W } = require('../lib');

sec('fv', 'C2  ·  FAHRVERBOTE UND MITFAHRER', C.am, 'bg_am.jpg');
sec('pap', 'C2  ·  PAPIERE UND MAUT', C.gr, 'bg_gr.jpg');
sec('c2e', 'C2  ·  ABSCHLUSS', C.gr, 'bg_gr.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'fv', { num: 5, ttl: 'Fahrverbote und Mitfahrer', sub: 'Sonntags, in den Sommerferien – und wer wo mitfahren darf.', bg: 'f_sonntag.jpg', notes:
    '▶ Sagen: „Kapitel 5. Schaut euch das Bild an: Sonntagmorgen, der Parkplatz voller Lkw, die Autobahn fast leer. Warum?“\n🖱 Keine Klicks.\n➜ „Weil sonntags für viele Lkw Fahrverbot ist.“' });
  // ===== SONNTAGSFAHRVERBOT (Zeitleiste) =====
  {
    const s = base(deck, 'fv', { notes:
      '▶ Sagen: „An Sonn- und Feiertagen gilt ein Fahrverbot für Lkw.“\n' +
      '❓ „Für welche Lkw? Und von wann bis wann?“\n' +
      '🖱 Klick 1: Zeitleiste 0–22 Uhr · Klick 2: für wen · Klick 3: auch leer · Klick 4: Ausnahmen. (Die Bußgeldzeile unten steht von Anfang an.)\n' +
      '✅ § 30 Abs. 3 StVO: An Sonn- und Feiertagen von 0 bis 22 Uhr dürfen Lkw über 7,5 t zGM sowie Anhänger hinter Lkw (jeder Masse!) zur geschäftsmäßigen oder entgeltlichen Güterbeförderung einschließlich Leerfahrten nicht verkehren.\n' +
      '✅ Ausnahmen u. a.: kombinierter Verkehr Schiene–Straße (bis 200 km) und Hafen–Straße (bis 150 km), frische Milch, frisches Fleisch und Fisch, leicht verderbliches Obst und Gemüse, Pannenhilfe und Abschleppen.\n' +
      '✅ Verstoß: Fahrer 120 € (BKat Nr. 119), Halter 570 € (Nr. 120). Keine Punkte.\n' +
      '💡 Feiertage: bundesweite Feiertage; Fronleichnam, Reformationstag und Allerheiligen nur in den Ländern, in denen sie Feiertag sind (§ 30 Abs. 4).\n' +
      '➜ „Im Sommer kommt noch ein Verbot dazu.“' });
    kick(s, 'Sonn- und Feiertagsfahrverbot · § 30 Abs. 3 StVO'); title(s, 'Sonntags: 0 bis 22 Uhr', { size: 36 });
    const x0 = 0.9, w = 11.5, y0 = 2.15, k = w / 24;
    s.rect(x0, y0, w, 0.7, { fill: C.card, line: C.line });
    for (let h = 0; h <= 24; h += 2) s.text(String(h), { x: x0 + h * k - 0.3, y: y0 + 0.75, w: 0.6, h: 0.3, size: 12, color: C.dim, align: 'center' });
    s.rect(x0, y0, 22 * k, 0.7, { fill: C.red }, { fx: 'wipeR', c: true, dur: 1000 });
    s.text('FAHRVERBOT 0 – 22 Uhr', { x: x0, y: y0, w: 22 * k, h: 0.7, size: 20, bold: true, color: C.white, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 300, d: 600 });
    s.rect(x0 + 22 * k, y0, 2 * k, 0.7, { fill: C.gr }, { fx: 'fade', dur: 300, d: 900 });
    s.text('frei', { x: x0 + 22 * k, y: y0, w: 2 * k, h: 0.7, size: 16, bold: true, color: C.dark, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 300, d: 900 });
    await point(s, 0.7, 3.4, 5.85, 1.35, 'LuTruck', C.am, 'Lkw über 7,5 t', 'und JEDER Lkw mit Anhänger – egal wie schwer.', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 3.4, 5.85, 1.35, 'LuPackage', C.am, 'Gewerblich – auch leer', 'Güterbeförderung gegen Geld oder geschäftsmäßig, Leerfahrten eingeschlossen.', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 4.95, 11.93, 1.2, 'LuLeaf', C.gr, 'Ausnahmen (Beispiele):', 'frische Milch, Fleisch, Fisch, leicht verderbliches Obst und Gemüse · kombinierter Verkehr Schiene/Hafen · Pannenhilfe.', CLICK, { br: true, size: 16 });
    foot(s, 'Fahrer 120 €, Halter 570 € – keine Punkte (BKat Nr. 119, 120)');
  }
  // ===== FERIENREISEVERORDNUNG (Kalender) =====
  {
    const s = base(deck, 'fv', { notes:
      '▶ Sagen: „In den Sommerferien gibt es zusätzlich ein Samstags-Fahrverbot auf bestimmten Autobahnen.“\n' +
      '🖱 Klick 1: Zeitraum Juli und August · Klick 2: die Samstage · Klick 3: Uhrzeit und Strecken.\n' +
      '✅ Ferienreiseverordnung: vom 1. Juli bis 31. August an allen Samstagen von 7 bis 20 Uhr für Lkw über 7,5 t zGM und Lkw mit Anhänger – auf den in § 1 genannten Autobahn- und Bundesstraßenabschnitten (z. B. Teile von A 1, A 3, A 5, A 7, A 8, A 9).\n' +
      '✅ Verstoß: 60 € (über 15 Minuten in der Verbotszeit, BKat Nr. 239), Halter 150 € (Nr. 240). Keine Punkte.\n' +
      '💡 Ausnahmen ähnlich wie beim Sonntagsfahrverbot (z. B. frische Lebensmittel). Vor der Tour die Strecke prüfen.\n' +
      '➜ „Testen wir die Fahrverbote.“' });
    kick(s, 'Ferienreiseverordnung'); title(s, 'Sommer: samstags 7 bis 20 Uhr', { size: 36 });
    const months = [['JULI', 31, 2], ['AUGUST', 31, 5]]; // Wochentag des 1. (0 = Montag) – schematisch
    for (let m = 0; m < 2; m++) {
      const x0 = 0.7 + m * 4.15, y0 = 2.05;
      card(s, x0, y0, 3.95, 3.95, {}, m === 0 ? CLICK : { fx: 'flyL', dur: 450 });
      s.text(months[m][0], { x: x0, y: y0 + 0.12, w: 3.95, h: 0.4, size: 16, bold: true, color: C.am, align: 'center', cs: 3 }, { fx: 'fade', dur: 150 });
      'MDMDFSS'.split('').forEach((d, j) => s.text(d, { x: x0 + 0.2 + j * 0.51, y: y0 + 0.55, w: 0.5, h: 0.3, size: 12, bold: true, color: j === 5 ? C.am : C.dim, align: 'center' }, { fx: 'fade', dur: 150 }));
      for (let d = 1; d <= months[m][1]; d++) {
        const p = d - 1 + months[m][2], c = p % 7, r = Math.floor(p / 7);
        const x = x0 + 0.2 + c * 0.51, y = y0 + 0.9 + r * 0.5;
        if (c === 5) s.text(String(d), { x: x + 0.03, y: y + 0.02, w: 0.44, h: 0.42, size: 13, bold: true, color: C.dark, fill: C.am, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle' }, { fx: 'zoom', c: m === 0 && r === 0, dur: 250, d: (m * 5 + r) * 60 });
        else s.text(String(d), { x, y, w: 0.5, h: 0.45, size: 13, color: C.mut, align: 'center', valign: 'middle' }, { fx: 'fade', dur: 100 });
      }
    }
    await point(s, 9.15, 2.05, 3.48, 1.85, 'LuClock', C.am, '7 – 20 Uhr', 'Samstage 1.7.–31.8., gewerblich – auch leer', CLICK, { br: true, size: 16 });
    await point(s, 9.15, 4.1, 3.48, 1.9, 'LuRoute', C.am, 'Nur bestimmte Strecken', 'Abschnitte z. B. von A 1, A 3, A 5, A 7, A 8, A 9', { fx: 'flyL', dur: 450 }, { br: true, size: 16 });
    foot(s, 'Kalender schematisch – die Wochentage ändern sich jedes Jahr · Lkw über 7,5 t und Lkw mit Anhänger · 60 €, keine Punkte');
  }
  quiz(deck, 'fv', {
    kicker: 'Frage · Sonntagsfahrverbot', q: 'Sonntag, 21:30 Uhr. Du fährst einen 7-t-Lkw mit Anhänger, leer, für deine Spedition. Darfst du los?', size: 26,
    opts: ['Ja – unter 7,5 t gilt kein Verbot', 'Ja – leer zählt nicht', 'Nein – erst ab 22 Uhr'], ok: 2,
    why: '§ 30 Abs. 3 StVO: Das Verbot gilt auch für jeden Lkw mit Anhänger und ausdrücklich für Leerfahrten. Erst ab 22 Uhr ist die Fahrt erlaubt.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ C.\n💡 Zwei Fallen in einer Frage: Anhänger (dann egal wie schwer) und Leerfahrt (zählt mit).\n➜ „Gibt es Ausnahmen?“',
  });
  quiz(deck, 'fv', {
    kicker: 'Frage · Ausnahme', q: 'Sonntag, 10 Uhr. Dein 18-t-Lkw ist mit frischer Milch beladen. Darfst du fahren?', size: 30,
    opts: ['Nein – Sonntag ist Sonntag', 'Ja – frische Milch ist vom Sonntagsfahrverbot ausgenommen', 'Nur auf der Autobahn'], ok: 1,
    why: '§ 30 Abs. 3 Satz 2 StVO: Ausgenommen ist u. a. die Beförderung von frischer Milch, frischem Fleisch und Fisch sowie leicht verderblichem Obst und Gemüse (und die Leerfahrten dafür).',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Die Ausnahme gilt für die Ware – nicht für den ganzen Tag. Wer danach Möbel lädt, steht wieder im Verbot.\n➜ „Wer darf im Lkw mitfahren?“',
  });
  // ===== MITFAHRER =====
  await ask(deck, 'fv', {
    kicker: 'Mitfahrer · § 21 StVO', q: 'Euer Kollege will auf der Ladefläche mitfahren. Darf er das?', ico: 'LuUsers',
    answers: [
      ['LuBan', 'Nein', '– auf der Ladefläche und im Laderaum dürfen grundsätzlich keine Personen mitfahren.'],
      ['LuArmchair', 'Nur so viele, wie Sitze mit Gurt da sind.', 'Im Fahrerhaus: Sitzplätze zählen, Gurt anlegen.'],
      ['LuWrench', 'Ausnahme', 'wer auf der Ladefläche notwendige Arbeiten macht – oder Baustellenpersonal innerhalb der Baustelle.'],
    ],
    notes:
      '▶ Sagen: „Kurz vor Feierabend: Ein Kollege will hinten auf der Ladefläche mitfahren. Was sagt ihr?“\n' +
      '❓ Antworten sammeln.\n' +
      '🖱 Klick 1: Nein · Klick 2: Sitzplätze · Klick 3: Ausnahme.\n' +
      '✅ § 21 Abs. 1 StVO: Nicht mehr Personen als Sitzplätze mit Sicherheitsgurt. § 21 Abs. 2: Auf der Ladefläche oder im Laderaum dürfen keine Personen mitgenommen werden – außer für notwendige Arbeiten dort oder Baustellenpersonal innerhalb von Baustellen. Auf Anhängern: nur auf geeigneten Sitzen in der Land- und Forstwirtschaft.\n' +
      '✅ Verstoß: 5 € (BKat Nr. 97) – lächerlich wenig, aber bei einer Vollbremsung lebensgefährlich, und es kann Ärger mit der Versicherung geben.\n' +
      '➜ „Ein Bauteil am Lkw schützt die anderen: der Unterfahrschutz.“',
  });
  // ===== UNTERFAHRSCHUTZ (Seitenansicht) =====
  {
    const s = base(deck, 'fv', { notes:
      '▶ Sagen: „Wenn ein Pkw auf einen Lkw auffährt, rutscht er sonst unter die Ladefläche – genau in Kopfhöhe der Insassen. Deshalb gibt es den Unterfahrschutz.“\n' +
      '🖱 Klick 1: hinten · Klick 2: seitlich · Klick 3: vorne · Klick 4: Wechselaufbauten.\n' +
      '✅ § 32b StVZO: hinterer Unterfahrschutz für Kfz und Anhänger (auch mit Wechselaufbauten) über 25 km/h, wenn der Abstand Heck–letzte Achse mehr als 1.000 mm und die Höhe der Unterkante mehr als 550 mm beträgt; vorderer Unterfahrschutz für Güter-Kfz über 3,5 t.\n' +
      '✅ § 32c StVZO: seitliche Schutzvorrichtungen für Lkw, Zugmaschinen und Anhänger über 3,5 t (über 25 km/h) – schützen Radfahrer und Fußgänger davor, unter die Räder zu geraten.\n' +
      '✅ Wechselaufbauten und Container: Der Auftraggeber muss euch vor der Fahrt eine Erklärung über das Gewicht geben; sie ist mitzuführen (§ 7 GüKG).\n' +
      '💡 Bei der Abfahrtkontrolle prüfen: Ist der Unterfahrschutz da, fest und nicht verbogen? Hochgeklappte Teile wieder einrasten.\n' +
      '➜ „Letztes Kapitel: Papiere und Maut.“' });
    kick(s, 'Unterfahrschutz · §§ 32b, 32c StVZO'); title(s, 'Damit niemand unter den Lkw gerät', { size: 34 });
    // Lkw-Seitenansicht (gezeichnet)
    const gy = 5.2;
    s.rect(0.7, gy, 11.9, 0.04, { fill: C.dim });
    s.rrect(1.2, 2.55, 1.9, 2.15, { fill: 'D9DEE6', rr: 0.08 }); // Fahrerhaus
    s.rect(1.35, 2.7, 1.2, 0.85, { fill: '2B3F55' }); // Fenster
    s.rect(3.25, 2.35, 7.4, 2.35, { fill: 'C8CED8' }); // Koffer
    s.rect(1.2, 4.7, 9.45, 0.18, { fill: '3C4656' }); // Rahmen
    for (const x of [2.05, 7.6, 8.75]) { s.oval(x - 0.42, 4.55, 0.84, 0.84, { fill: '1B1F26', line: '555F6E', lw: 2 }); s.oval(x - 0.17, 4.8, 0.34, 0.34, { fill: '8A939F' }); }
    // hinten
    s.rect(10.45, 4.75, 0.2, 0.3, { fill: C.am }, { fx: 'zoom', c: true, dur: 350 });
    s.rect(10.0, 4.95, 0.75, 0.12, { fill: C.am }, { fx: 'wipeR', dur: 300 });
    s.text('hinten', { x: 10.2, y: 5.35, w: 1.6, h: 0.35, size: 16, bold: true, color: C.am }, { fx: 'fade', dur: 200 });
    // seitlich
    s.rect(3.0, 4.95, 4.1, 0.1, { fill: C.or }, { fx: 'wipeR', c: true, dur: 500 });
    s.rect(3.0, 4.75, 4.1, 0.08, { fill: C.or }, { fx: 'wipeR', dur: 500 });
    s.text('seitlich – schützt Radfahrer und Fußgänger', { x: 3.0, y: 5.35, w: 5.5, h: 0.35, size: 16, bold: true, color: C.or }, { fx: 'fade', dur: 200 });
    // vorne
    s.rect(1.05, 4.6, 0.15, 0.45, { fill: C.bl }, { fx: 'zoom', c: true, dur: 350 });
    s.text('vorne', { x: 0.7, y: 5.35, w: 1.5, h: 0.35, size: 16, bold: true, color: C.bl }, { fx: 'fade', dur: 200 });
    s.text([{ text: 'Wechselaufbau / Container:  ', options: { bold: true, color: C.am } }, { text: 'Gewichtserklärung vom Auftraggeber mitführen (§ 7 GüKG).', options: { color: C.txt } }],
      { x: 0.7, y: 5.95, w: 11.93, h: 0.7, size: 17, valign: 'middle', fill: C.card2, line: C.am, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.1, margin: [8, 14, 8, 14] }, { fx: 'rise', c: true, dur: 400 });
  }
  // ================= KAPITEL 6: PAPIERE UND MAUT =================
  await chapter(deck, 'pap', { num: 6, ttl: 'Papiere und Maut', sub: 'Was zur Ladung gehört – und was die Straße kostet.', ico: 'LuFileText', notes:
    '▶ Sagen: „Letztes Kapitel von heute: Ladungspapiere und Maut.“\n🖱 Keine Klicks.\n➜ „Ihr holt eine Ladung ab. Welche Papiere bekommt ihr?“' });
  {
    const s = base(deck, 'pap', { notes:
      '▶ Sagen: „Zu jeder gewerblichen Fahrt gehören Papiere für die Ladung.“\n' +
      '❓ „Wer hat schon mal einen Lieferschein oder Frachtbrief gesehen?“\n' +
      '🖱 Klick 1: Begleitpapier · Klick 2: Frachtbrief · Klick 3: CMR · Klick 4: Lizenz.\n' +
      '✅ § 7 Abs. 1 GüKG: Im gewerblichen Güterkraftverkehr ein Begleitpapier oder sonstiger Nachweis mitführen (Gut, Be- und Entladeort, Auftraggeber) – auch elektronisch möglich.\n' +
      '✅ § 408 HGB: Der Frachtführer kann einen Frachtbrief verlangen; er wird in drei Originalen ausgestellt (Absender, mit dem Gut, Frachtführer). Elektronisch ist gleichgestellt.\n' +
      '✅ International: CMR-Frachtbrief (internationales Übereinkommen).\n' +
      '✅ Gewerblicher Güterkraftverkehr braucht eine Gemeinschaftslizenz – seit 2026 auch im Inland. Ältere nationale Erlaubnisse gelten bis zum Ende ihrer Befristung (unbefristete bis 27.02.2036). Beglaubigte Kopie mitführen, nicht eingeschweißt (§§ 3, 7, 24 GüKG).\n' +
      '💡 Werkverkehr (eigene Güter, eigenes Personal) braucht keine Lizenz (§ 1 Abs. 2 GüKG).\n' +
      '➜ „Und dann kommt die Rechnung für die Straße: die Maut.“' });
    kick(s, 'Ladungspapiere'); title(s, 'Was gehört zur Ladung?');
    const T = [['LuFileText', 'Begleitpapier', 'Was wird gefahren, von wo nach wo, für wen (§ 7 GüKG).'], ['LuFileCheck', 'Frachtbrief', 'national, 3 Originale – auch elektronisch (§ 408 HGB).'], ['LuGlobe', 'CMR-Frachtbrief', 'für Fahrten ins Ausland.'], ['LuShieldCheck', 'Lizenz-Kopie', 'beglaubigt, bei gewerblichem Transport – nicht bei Werkverkehr.']];
    for (let i = 0; i < 4; i++) {
      const col = i % 2, row = Math.floor(i / 2), x = 0.7 + col * 6.08, y = 2.05 + row * 2.1;
      await point(s, x, y, 5.85, 1.85, T[i][0], C.gr, T[i][1], T[i][2], CLICK, { br: true, size: 18 });
    }
  }
  // ===== MAUT =====
  {
    const s = base(deck, 'pap', { notes:
      '▶ Sagen: „Auf Autobahnen und Bundesstraßen zahlen Lkw Maut – pro Kilometer.“\n' +
      '❓ „Ab welchem Gewicht?“\n' +
      '🖱 Klick 1: ab 3,5 t · Klick 2: wo · Klick 3: CO₂ · Klick 4: Fahrer haftet mit · Klick 5: Handwerker-Ausnahme.\n' +
      '✅ Bundesfernstraßenmautgesetz § 1: Kfz bzw. Fahrzeugkombinationen für den Güterkraftverkehr mit technisch zulässiger Gesamtmasse über 3,5 t (seit 1.7.2024; vorher ab 7,5 t). Mautpflichtig: Bundesautobahnen und Bundesstraßen.\n' +
      '✅ Seit 1.12.2023 enthält die Maut einen CO₂-Aufschlag – saubere Fahrzeuge zahlen weniger. Emissionsfreie Lkw sind bis 30.06.2031 befreit.\n' +
      '✅ Mautschuldner ist auch der Fahrer (§ 2 BFStrMG). Wer ohne Bezahlung (On-Board-Unit oder Buchung) fährt, riskiert Nacherhebung und Bußgeld.\n' +
      '✅ Handwerker-Ausnahme: unter 7,5 t für Material, Ausrüstung, Maschinen zur Ausübung des Handwerks bzw. Auslieferung handwerklich hergestellter Güter, wenn nicht gewerblich (§ 1 Abs. 2 Nr. 10).\n' +
      '➜ „Kurz testen.“' });
    kick(s, 'Lkw-Maut · Bundesfernstraßenmautgesetz'); title(s, 'Die Straße kostet');
    await point(s, 0.7, 2.05, 5.85, 1.35, 'LuWeight', C.gr, 'Über 3,5 t', 'technisch zulässige Gesamtmasse – seit Juli 2024', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 2.05, 5.85, 1.35, 'LuRoute', C.gr, 'Autobahnen und Bundesstraßen', 'Abrechnung pro Kilometer', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 3.55, 5.85, 1.35, 'LuLeaf', C.gr, 'CO₂-Aufschlag', 'saubere Lkw zahlen weniger', CLICK, { br: true, size: 17 });
    await point(s, 6.78, 3.55, 5.85, 1.35, 'LuUsers', C.or, 'Fahrer zahlt mit', 'auch der Fahrer ist Mautschuldner', CLICK, { br: true, size: 17 });
    await point(s, 0.7, 5.05, 11.93, 1.2, 'LuWrench', C.bl, 'Ausnahme Handwerker', 'unter 7,5 t mit eigenem Material oder Werkzeug, nicht gewerblich – keine Maut.', CLICK, { br: true, size: 17 });
  }
  quiz(deck, 'pap', {
    kicker: 'Frage · Maut', q: 'Ein Dachdecker fährt mit seinem 5-t-Lkw eigenes Material zur Baustelle. Muss er auf der Autobahn Maut zahlen?', size: 28,
    opts: ['Ja – über 3,5 t immer', 'Nein – Handwerker-Ausnahme unter 7,5 t', 'Nur auf Bundesstraßen'], ok: 1,
    why: '§ 1 Abs. 2 Nr. 10 BFStrMG: Fahrzeuge unter 7,5 t, die Material, Ausrüstung oder Maschinen zur Ausübung des Handwerks befördern, sind mautfrei, wenn nicht gewerblich gefahren wird.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Fährt derselbe Lkw gegen Bezahlung für andere (Spedition), ist er mautpflichtig.\n➜ „Jetzt bringen wir alles zusammen: ein Fall aus dem echten Leben.“',
  });
  // ===== FALL DES ABENDS (C1 + C2 zusammen) =====
  await ask(deck, 'c2e', {
    kicker: 'Fall des Abends', q: 'Montag, 5 Uhr: Mit 12 t Stückgut von Offenbach nach Hamburg, rund 500 km. Was müsst ihr beachten?', ico: 'LuRoute', qsize: 28,
    answers: [
      ['LuGauge', 'Tempo:', 'Autobahn 80 km/h, 50 m Abstand – bei rund 70 km/h Schnitt etwa 7 h reine Lenkzeit.'],
      ['LuCoffee', 'Pause:', 'spätestens nach 4,5 h Lenkzeit 45 Minuten (oder 15 + 30) – Rastplatz vorher einplanen.'],
      ['LuEuro', 'Maut:', 'über 3,5 t, gewerblich – Maut auf Autobahn und Bundesstraße.'],
      ['LuFileText', 'Papiere:', 'Führerschein, Fahrzeugschein, Fahrerkarte, „95“, Begleitpapier, Lizenz-Kopie.'],
    ],
    notes:
      '▶ Sagen: „Jetzt bringen wir alles von heute zusammen: C1 und C2. Ein echter Auftrag.“\n' +
      '❓ Die Klasse soll selbst planen: „Wie lange seid ihr unterwegs? Wann macht ihr Pause? Was kostet es? Was müsst ihr dabeihaben?“\n' +
      '🖱 Klick 1: Tempo · Klick 2: Pause · Klick 3: Maut · Klick 4: Papiere.\n' +
      '✅ 500 km bei rund 70 km/h Schnitt ≈ 7 h Lenkzeit → unter 9 h, also ohne Verlängerung möglich, aber mit Pause nach spätestens 4,5 h (Art. 6, 7 VO 561/2006).\n' +
      '✅ Gewerblicher Güterverkehr über 3,5 t: mautpflichtig (BFStrMG), Begleitpapier und beglaubigte Lizenz-Kopie mitführen (§ 7 GüKG), Fahrerkarte stecken, Nachweis 95.\n' +
      '💡 Rückfahrt am selben Tag? Nein: 14 h Lenkzeit wären zu viel – erst nach 11 h Ruhe.\n' +
      '➜ „Schreibt euch die wichtigsten Regeln aus C2 auf.“',
  });
  // ===== MITSCHREIBEN C2 =====
  write(deck, 'c2e', {
    ttl: 'Besondere Regeln für Lkw', labelW: 4.4, size: 18,
    rows: [
      ['Tempo außerorts', 'bis 7,5 t: 80 · über 7,5 t / mit Anhänger: 60 · Autobahn: 80'],
      ['Abstand Autobahn', 'mindestens 50 m (über 3,5 t, schneller als 50 km/h)'],
      ['Linke Spur', 'bei 3 Fahrstreifen: über 3,5 t und mit Anhänger tabu'],
      ['Bahnübergang', 'kein Platz hinter dem Gleis → vor dem Andreaskreuz warten'],
      ['Parken Wohngebiet', 'über 7,5 t / Anhänger über 2 t: nicht regelmäßig 22–6 Uhr, sonn- und feiertags'],
      ['Sonntagsfahrverbot', '0–22 Uhr: über 7,5 t und jeder Lkw mit Anhänger'],
      ['Ferienreise-VO', '1.7.–31.8., samstags 7–20 Uhr, bestimmte Strecken'],
    ],
    notes: '▶ Sagen: „Das sind die sieben Regeln aus C2, die ihr sicher können müsst. Schreibt mit.“\n❓ Vor jedem Klick fragen.\n🖱 Klick 1–7: je eine Lösung.\n✅ § 3 Abs. 3, § 18 Abs. 5, § 4 Abs. 3, § 7 Abs. 3c, § 19 Abs. 3, § 12 Abs. 3a, § 30 Abs. 3 StVO, Ferienreiseverordnung.\n➜ „Und jetzt das Abschluss-Quiz.“',
  });
  quiz(deck, 'c2e', {
    kicker: 'Quiz C2 · 1', q: 'Du fährst mit deinem 12-t-Lkw auf der Autobahn 80 km/h hinter einem anderen Lkw. Wie viel Abstand musst du mindestens halten?', size: 28,
    opts: ['25 m', '50 m', 'halber Tacho = 40 m'], ok: 1,
    why: '§ 4 Abs. 3 StVO: Lkw über 3,5 t auf Autobahnen bei mehr als 50 km/h mindestens 50 m Abstand. Halber Tacho wären hier nur 40 m – zu wenig.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n💡 Zusatzfrage an die Klasse: „Und wenn ihr 85 fahrt?“ – Zu schnell: Lkw dürfen auf der Autobahn höchstens 80 km/h (§ 18 Abs. 5).\n➜ „Nächste Frage.“',
  });
  quiz(deck, 'c2e', {
    kicker: 'Quiz C2 · 2', q: 'Vor dem Bahnübergang staut sich der Verkehr bis hinter das Gleis. Was tust du?', size: 30,
    opts: ['Langsam auf das Gleis rollen, der Stau löst sich gleich', 'Vor dem Andreaskreuz warten, bis hinter dem Gleis Platz für den ganzen Lkw ist', 'Hupen, damit die anderen aufrücken'], ok: 1,
    why: '§ 19 Abs. 3 StVO: Kann der Bahnübergang nicht zügig und ohne Aufenthalt überquert werden, ist vor dem Andreaskreuz zu warten.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B.\n➜ „Und die letzte.“',
  });
  quiz(deck, 'c2e', {
    kicker: 'Quiz C2 · 3', q: 'Für welche Fahrzeuge gilt das Überholverbot dieses Zeichens?', size: 32,
    opts: ['Nur für Lkw über 7,5 t', 'Für Kfz über 3,5 t (auch mit Anhänger) und Zugmaschinen – nicht für Pkw und Busse', 'Für alle Fahrzeuge'], ok: 1,
    why: 'Zeichen 277: Überholverbot für Kfz über 3,5 t zulässiger Gesamtmasse einschließlich ihrer Anhänger und für Zugmaschinen. Pkw und Busse sind ausgenommen (nur mit Zusatzzeichen betroffen). Verstoß: 70 €, 1 Punkt.',
    notes: '▶ Auf das Schild zeigen, Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ B. (StVO Anlage 2 lfd. Nr. 54; BKat Nr. 153a).\n💡 Mit Zusatzzeichen kann das Verbot auch für Busse und Pkw mit Anhänger gelten – ohne Zusatzzeichen nicht.\n➜ „Zum Schluss: Das nehmt ihr aus C2 mit.“',
  });
  // Schild zur letzten Quizfrage
  await sign(deck.slides[deck.slides.length - 1], '277', 11.25, 2.65, 1.35, 1.35);
  await takeaway(deck, 'c2e', {
    items: [
      ['LuGauge', 'Tempo:', 'innerorts 50 · außerorts 80 (bis 7,5 t) bzw. 60 · Autobahn 80 · Begrenzer 90.'],
      ['LuMoveHorizontal', 'Abstand und Spur:', '50 m auf der Autobahn · bei 3 Fahrstreifen nicht links · Überholen nur deutlich schneller.'],
      ['LuTrainFront', 'Bahnübergang:', 'kein Platz für den ganzen Lkw → vor dem Andreaskreuz warten.'],
      ['LuCalendarX', 'Fahrverbote:', 'Sonn- und Feiertage 0–22 Uhr · Sommer samstags 7–20 Uhr – auch leer, auch jeder Zug.'],
      ['LuFileText', 'Papiere und Maut:', 'Begleitpapier / Frachtbrief, Lizenz-Kopie · Maut über 3,5 t auf Autobahn und Bundesstraße.'],
    ],
    notes: '▶ Sagen: „Fünf Punkte aus C2. Wer kann sie mit eigenen Worten sagen?“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Das war Abend 1. Beim nächsten Mal geht es um die Technik.“',
  });
  // ===== ENDE =====
  {
    const s = base(deck, 'c2e', { bg: 'f_nacht.jpg', ov: 9.0, footer: false, transition: 'black', notes:
      '▶ Sagen: „Das war Abend 1. Beim nächsten Mal: C3 Kraftstrang – Motor, Kupplung, Getriebe – und C4 Fahrwerk und Elektrik. Danke fürs Mitmachen, kommt gut nach Hause.“\n' +
      '💡 Ausbildungsnachweis abzeichnen lassen.\n' +
      '🖱 Keine Klicks.' });
    s.img('ov_left.png', { x: 0, y: 0, w: 7.5, h: 7.5, name: '!!ov2' });
    s.img('boost_logo.png', { x: 0.7, y: 0.6, w: 1.6, h: 0.55, sizing: 'contain' }, { fx: 'fade', auto: true, dur: 800 });
    s.text('Gute Heimfahrt!', { x: 0.7, y: 2.4, w: 6.5, h: 1.2, size: 54, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900 });
    s.text('Abend 1 geschafft: C1 + C2', { x: 0.7, y: 3.65, w: 6.5, h: 0.6, size: 22, color: C.gr }, { fx: 'fade', auto: true, dur: 700, d: 400 });
    s.text([{ text: 'Nächstes Mal:', options: { bold: true, color: C.mut, breakLine: true } }, { text: 'C3  Kraftstrang', options: { color: C.txt, breakLine: true } }, { text: 'C4  Fahrwerk / Elektrische Anlagen', options: { color: C.txt } }], { x: 0.7, y: 4.6, w: 6.3, h: 1.4, size: 20 }, { fx: 'fade', auto: true, dur: 700, d: 800 });
  }
};
