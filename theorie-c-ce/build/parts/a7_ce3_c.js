// Abend 7 · CE3: Kapitel 5 Dauerbremse im Zug und Prüffristen am Anhänger, Abschluss CE3, Pause
const { C, sec, chapter, motion, steps, quiz, ask, write, takeaway, base, roadH } = require('../gs');
const { zugTop, uv } = require('../zugtop');

sec('ce3d', 'CE3  ·  DAUERBREMSE UND PRÜFFRISTEN', 'C9A227', 'bg_am.jpg');
sec('ce3e', 'CE3  ·  ABSCHLUSS', C.bl, 'bg_blue.jpg');

module.exports = async (deck) => {
  await chapter(deck, 'ce3d', { num: 5, ttl: 'Dauerbremse und Prüffristen', sub: 'Die Dauerbremse bremst nur die Antriebsachse des Lkw. Und: Wann muss der Anhänger zur Prüfung?', ico: 'LuMountain', notes:
    '▶ Sagen: „Motorbremse und Retarder kennt ihr aus C6. Im Zug gibt es dabei eine Falle. Und danach: Wann muss der Anhänger zur HU und zur SP?“\n✅ § 41 Abs. 15 StVZO (Dauerbremse über 9 t); StVZO Anlage VIII (HU und SP).\n🖱 Keine Klicks.\n➜ „Erst die Falle mit dem Retarder.“' });

  // ===== RETARDER AUF GLÄTTE (Draufsicht, fließend) =====
  {
    const S = 0.26, RX = 5.65, RW = 7.45, R = 2.3, RH = 7 * S, LY = R + RH * 0.75;
    const U = [0, 0.3, 0.6, 0.85, 1], A = [0, 0, -5, -15, -30], FX0 = 10.17, D = 1.6;
    const pose = k => {
      const a = A[k], F = [FX0 + D * (1 - (1 - U[k]) ** 2), LY], u = uv(a);
      const H = [F[0] - u[0] * 8.1 * S, F[1] - u[1] * 8.1 * S];
      const b = Math.asin(Math.max(-1, Math.min(1, (LY - H[1]) / (7.4 * S)))) * 180 / Math.PI;
      return { H, a, b };
    };
    const fr = (t, o = {}) => ({ ...o, t });
    await motion(deck, 'ce3d', {
      kicker: 'Dauerbremse', ttl: 'Retarder auf Glätte', dur: 650, holdDur: 650,
      question: 'Glatte Fahrbahn, ihr zieht den Retarder voll. Was kann mit dem Zug passieren?',
      answer: 'Der Retarder bremst nur die Antriebsachse. Die Räder rutschen, der Anhänger schiebt – der Zug knickt ein. Bei Glätte: Dauerbremse aus oder nur schwach.',
      legend: 'Draufsicht · schematisch · glatte Fahrbahn',
      frames: [
        fr({ k: 0, msg: 'Glatte Fahrbahn. Der Fahrer zieht den Retarder voll.', mc: C.mut }, { hold: true,
          cap: 'Der Retarder bremst verschleißfrei – aber nur über die Antriebsachse des Lkw. Vorderachse und Anhänger bremst er nicht.',
          note: '▶ Sagen: „Glatte Straße. Der Fahrer will sanft verzögern und zieht den Retarder voll. Unten seht ihr: Welche Achse bremst wie stark?“\n❓ Frage auf der Folie stellen.\n✅ eurotransport „Profiwissen Retarder“ (15.11.2012): Der Retarder wirkt nur auf einzelne Achsen des Gespanns – für das Spurverhalten „erfahrungsgemäß fatale Folgen“. Prüfungsfrage 2.7.06-108.\n🖱 Klick: Retarder an (läuft von selbst weiter).\n➜ „Retarder voll.“' }),
        fr({ k: 1, msg: 'Nur die Antriebsachse bremst. Der Anhänger rollt ungebremst – er schiebt.', mc: C.am }),
        fr({ k: 2, msg: 'Die Antriebsräder verlieren die Haftung …', mc: C.red }),
        fr({ k: 3, msg: '… das Heck des Lkw bricht aus …', mc: C.red }),
        fr({ k: 4, msg: 'Der Zug knickt ein!', mc: C.red }, { hold: true, answer: true,
          cap: 'Bei Glätte: Dauerbremse aus oder nur schwach. Vorher Tempo raus, vor der Kurve gestreckt bremsen. ABS schaltet die Dauerbremse zwar ab – aber das ist kein Freibrief.',
          note: '▶ „Die Antriebsräder rutschen, weil nur sie bremsen. Der Anhänger schiebt von hinten. Das Heck des Lkw bricht aus – der Zug knickt ein. Darum: Bei Glätte die Dauerbremse aus oder nur ganz schwach. Lieber vorher langsam und mit der Betriebsbremse gestreckt bremsen – dann bremst auch der Anhänger mit.“\n❓ Frage auf der Folie auflösen.\n✅ Mercedes-Benz Actros Betriebsanleitung: „Schalten Sie nicht auf glatter Fahrbahn die Dauerbremse ein“ – die Antriebsräder können die Haftung verlieren. ABS schaltet die Dauerbremse ab, sobald es regelt (Actros Betriebsanleitung; WABCO EBS3). Prüfungsfrage 2.7.06-108.\n💡 Winkel und Wege gezeichnet, nicht gemessen.\n🖱 Nächster Klick: nächste Folie.\n➜ „Was gilt sonst noch für die Dauerbremse im Zug?“' }),
      ],
      scene: async (s, t) => {
        const k = t.k, p = pose(k);
        roadH(s, RX, R, RW, RH, { name: 'rd', fill: '2B3848' });
        s.text('❄  Glatte Fahrbahn', { x: RX, y: R - 0.46, w: 4, h: 0.3, size: 14, bold: true, color: C.bl, name: '!!rdt' });
        const trailLkw = k >= 2 ? [1, 2, 3].filter(j => j < k).map(j => { const q = pose(j); return { H: q.H, a: q.a }; }) : [];
        zugTop(s, { H: p.H, a: p.a, b: p.b, S, nm: 'r', trailLkw, nTrailL: 3, hlL: k >= 2 ? C.red : undefined });
        // Hinweis an der Antriebsachse
        const u = uv(p.a), ax = [p.H[0] + u[0] * 1.65 * S, p.H[1] + u[1] * 1.65 * S];
        s.oval(ax[0] - 0.42, ax[1] - 0.42, 0.84, 0.84, { line: C.am, lw: 2.5, fill: C.am, ft: 100, lt: k ? 0 : 100, name: '!!axr' });
        s.text(k ? 'Antriebsachse' : '', { x: ax[0] - 1.0, y: R + RH + 0.16, w: 2.0, h: 0.28, size: 12, bold: true, color: C.am, align: 'center', name: '!!axt' });
        s.text(t.msg, { x: RX, y: 4.55, w: RW, h: 0.55, size: 17, bold: true, color: t.mc, align: 'center', valign: 'middle', name: '!!msg' });
        // Wer bremst wie stark?
        const rows = [['Lkw-Vorderachse', 0], ['Lkw-Antriebsachse (Retarder)', k ? 1 : 0], ['Anhänger', 0]];
        rows.forEach(([lab, v], i) => {
          const y = 5.3 + i * 0.42;
          s.text(lab, { x: 5.75, y, w: 3.3, h: 0.34, size: 13, color: v ? C.am : C.mut, bold: !!v, valign: 'middle', name: '!!bl' + i });
          s.rrect(9.1, y + 0.06, 3.9, 0.22, { fill: '0B1119', line: '3C4656', rr: 0.3, name: '!!bb' + i });
          s.rrect(9.1, y + 0.06, Math.max(0.05, 3.9 * v), 0.22, { fill: C.am, ft: v ? 0 : 100, rr: 0.3, name: '!!bf' + i });
          s.text(v ? '' : 'bremst nicht', { x: 9.2, y, w: 3.7, h: 0.34, size: 11, italic: true, color: C.dim, valign: 'middle', name: '!!bn' + i });
        });
      },
    });
  }
  await ask(deck, 'ce3d', {
    kicker: 'Dauerbremse im Zug', q: 'Was gilt für die Dauerbremse, wenn ein Anhänger dran ist?', ico: 'LuMountain', qsize: 32,
    answers: [
      ['LuSnowflake', 'Glätte:', 'Dauerbremse aus oder nur schwach. Vorher Tempo raus und gestreckt bremsen.'],
      ['LuMountain', 'Langes Gefälle:', 'vorher einen kleinen Gang wählen und die Dauerbremse arbeiten lassen. Nur Betriebsbremse = Bremsen werden heiß.'],
      ['LuTriangleAlert', 'Der Anhänger hat meist keine Dauerbremse:', 'seine Radbremsen müssen das Gefälle aushalten. Darum vorher langsam.'],
      ['LuCpu', 'ABS hilft:', 'Regelt das ABS, schaltet es die Dauerbremse ab. Aber verlasst euch nicht darauf.'],
    ],
    notes:
      '▶ Sagen: „Vier Regeln für die Dauerbremse im Zug.“\n' +
      '❓ Vor jedem Klick fragen: „Was meint ihr?“\n' +
      '🖱 Klick 1–4: je eine Regel.\n' +
      '✅ Mercedes-Benz Actros Betriebsanleitung (Dauerbremse bei Glätte nicht einschalten; ABS schaltet Dauerbremse ab). Prüfungsfragen 2.7.06-310 (nur Betriebsbremse im Gefälle → Bremswirkung lässt gefährlich nach) und 2.7.06-236 (Betriebsbremse und niedrigerer Gang). § 41 Abs. 15 StVZO: Dauerbremse Pflicht über 9 t (7 % Gefälle, 6 km, 30 km/h); bei Anhängern über 9 t muss die Betriebsbremse diese Anforderung erfüllen.\n' +
      '💡 Manche Lkw haben einen Hebel, der nur den Anhänger bremst (Streckbremse). Laut Actros-Anleitung nur für kurze Bremsungen – kein Ersatz für die Dauerbremse.\n' +
      '➜ „Eine Prüfungsfrage.“',
  });
  await quiz(deck, 'ce3d', {
    kicker: 'Prüfungsfrage 2.7.06-230', q: 'Was geschieht, wenn bei eingeschalteter Dauerbremse die Betriebsbremse betätigt wird?', size: 32,
    opts: ['Die Räder der Antriebsachse(n) werden stärker abgebremst', 'Die Dauerbremse wird automatisch abgeschaltet', 'Die Räder der Antriebsachse(n) werden blockieren'], ok: [0],
    why: 'Beide Bremsen wirken zusammen auf die Antriebsachse. Auf Glätte ist das genau die Gefahr.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.06-230: A.\n➜ „Jetzt zu den Prüfungen am Anhänger.“',
  });

  // ===== PRÜFFRISTEN AM ANHÄNGER (Zeitleiste) =====
  {
    const X0 = 6.0, X1 = 12.7, M = m => X0 + (X1 - X0) * m / 48, LYt = 3.75;
    const HU = [12, 24, 36, 48], SP = [30, 42];
    const ST = [
      { ttl: 'Anhänger über 0,75 t bis 3,5 t', sub: 'HU alle 24 Monate · keine SP', hu: [24, 48], sp: [], uvv: 0 },
      { ttl: 'Anhänger über 3,5 t bis 10 t', sub: 'HU alle 12 Monate · keine SP', hu: HU, sp: [], uvv: 0 },
      { ttl: 'Anhänger über 10 t', sub: 'HU alle 12 Monate · ab dem 3. Jahr dazwischen die SP', hu: HU, sp: SP, uvv: 0 },
      { ttl: 'Anhänger über 10 t', sub: 'Dazu jedes Jahr die UVV-Prüfung – Sache des Unternehmers', hu: HU, sp: SP, uvv: 1 },
    ];
    await steps(deck, 'ce3d', {
      kicker: 'Prüffristen', ttl: 'Wann zur Prüfung?',
      list: ['bis 3,5 t', 'über 3,5 t bis 10 t', 'über 10 t', 'Dazu: UVV'],
      ask: { q: 'Euer Sattelanhänger hat 39 t und ist drei Jahre alt. Wann muss er zur Prüfung?', a: 'Alle 12 Monate zur HU – und genau dazwischen zur SP. Also alle 6 Monate eine Prüfung.', at: 2 },
      caps: [
        'Der Anhänger hat ein eigenes Kennzeichen – und eigene Prüftermine. Kleine Anhänger: HU alle 2 Jahre.',
        'Über 3,5 t: jedes Jahr zur HU.',
        'Über 10 t: jedes Jahr HU. Ab dem 3. Jahr kommt genau dazwischen die Sicherheitsprüfung (SP) dazu.',
        'Dazu die UVV-Prüfung: mindestens einmal im Jahr durch einen Sachkundigen. Dafür sorgt der Unternehmer.',
      ],
      notes: [
        '▶ Sagen: „Der Anhänger ist ein eigenes Fahrzeug mit eigenem Kennzeichen. Er hat eigene Prüftermine – unabhängig vom Lkw. Kleine Anhänger bis 3,5 Tonnen müssen alle zwei Jahre zur HU.“\n❓ Frage auf der Folie stellen.\n✅ StVZO Anlage VIII Nr. 2.1.5: Anhänger über 0,75 t bis 3,5 t HU 24 Monate (bis 0,75 t: erste HU nach 36, dann 24 Monate).\n➜ „Und schwerere Anhänger?“',
        '▶ „Über 3,5 bis 10 Tonnen: jedes Jahr zur HU. Eine SP gibt es hier nicht.“\n✅ StVZO Anlage VIII Nr. 2.1.5.3: Anhänger über 3,5 t bis 10 t HU 12 Monate.\n➜ „Und über 10 Tonnen?“',
        '▶ „Über 10 Tonnen – also fast jeder Anhänger im Fernverkehr: jedes Jahr HU. Ab dem dritten Jahr kommt genau in der Mitte die Sicherheitsprüfung dazu. Dann ist er alle sechs Monate dran.“\n❓ Frage auf der Folie auflösen.\n✅ StVZO Anlage VIII Nr. 2.1.5.4: Anhänger über 10 t: erste 24 Monate HU 12; danach HU 12 und SP 6 Monate. Gilt auch für Sattelanhänger (Nr. 2.1.5). SP-Frist zählt ab der letzten HU (Nr. 2.4).\n💡 Nachweis: HU-Plakette hinten am Kennzeichen des Anhängers, SP-Prüfmarke auf dem SP-Schild. Untersuchungsbericht (HU) und Prüfprotokoll (SP) aufbewahren (§ 29 Abs. 9 und 10 StVZO).\n➜ „Und noch eine Prüfung.“',
        '▶ „Dazu kommt die UVV-Prüfung – UVV heißt Unfallverhütungsvorschrift. Ein Sachkundiger prüft mindestens einmal im Jahr, ob das Fahrzeug betriebssicher ist – auch Rampen, Planen und Zurrpunkte. Dafür sorgt der Unternehmer, nicht ihr. Ihr macht die Abfahrtkontrolle.“\n✅ DGUV Vorschrift 70 § 57: mindestens einmal jährlich durch einen Sachkundigen; gilt auch für Anhänger (§ 2 Abs. 1). DGUV Vorschrift 70 § 36: Fahrer prüft vor jeder Schicht.\n💡 Den Fahrtenschreiber hat nur der Lkw – Prüfung alle 24 Monate (§ 57b StVZO).\n➜ „Eine Prüfungsfrage dazu.“',
      ],
      legend: 'Zeitleiste ab Erstzulassung · Monate',
      scene: async (s, i) => {
        const t = ST[i];
        s.text(t.ttl, { x: 5.75, y: 1.6, w: 7.3, h: 0.55, size: 24, bold: true, color: C.txt, name: '!!vt' });
        s.text(t.sub, { x: 5.75, y: 2.15, w: 7.3, h: 0.4, size: 16, color: 'C9A227', bold: true, name: '!!vs' });
        // Zeitleiste
        s.rect(X0, LYt - 0.02, X1 - X0, 0.04, { fill: '4A5566', name: '!!tl' });
        for (let m = 0; m <= 48; m += 6) s.rect(M(m) - 0.01, LYt - (m % 12 ? 0.06 : 0.11), 0.02, m % 12 ? 0.12 : 0.22, { fill: m % 12 ? '3C4656' : '738296', name: '!!tk' + m });
        [12, 24, 36, 48].forEach((m, j) => s.text('Jahr ' + (j + 1), { x: M(m) - 0.8, y: LYt + 0.15, w: 0.8, h: 0.28, size: 11, color: C.dim, align: 'right', name: '!!ty' + j }));
        s.text('Zulassung', { x: X0 - 0.4, y: LYt + 0.15, w: 1.2, h: 0.28, size: 11, color: C.dim, name: '!!t0' });
        // HU (blau, rund) und SP (gelb, eckig)
        HU.forEach((m, j) => {
          const on = t.hu.includes(m);
          s.text(on ? 'HU' : '', { x: M(m) - 0.29, y: LYt - 0.85, w: 0.58, h: 0.58, size: 13, bold: true, color: C.dark, fill: C.bl, ft: on ? 0 : 100, shape: deck.pres.shapes.OVAL, align: 'center', valign: 'middle', name: '!!hu' + j });
        });
        SP.forEach((m, j) => {
          const on = t.sp.includes(m);
          s.text(on ? 'SP' : '', { x: M(m) - 0.27, y: LYt - 0.82, w: 0.54, h: 0.54, size: 13, bold: true, color: C.dark, fill: C.am, ft: on ? 0 : 100, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.15, align: 'center', valign: 'middle', name: '!!sp' + j });
        });
        // UVV jährlich
        [12, 24, 36, 48].forEach((m, j) => {
          s.text(t.uvv ? 'UVV' : '', { x: M(m) - 0.32, y: LYt + 0.55, w: 0.64, h: 0.36, size: 11, bold: true, color: C.dark, fill: C.gr, ft: t.uvv ? 0 : 100, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', name: '!!uv' + j });
        });
        // Nachweise
        const N = [['HU', C.bl, 'Plakette hinten am Kennzeichen'], ['SP', C.am, 'Prüfmarke auf dem SP-Schild'], ['UVV', C.gr, 'Prüfnachweis vom Unternehmer']];
        N.forEach((n, j) => {
          const y = 5.15 + j * 0.45, show = j === 0 || (j === 1 && t.sp.length) || (j === 2 && t.uvv);
          s.text(n[0], { x: 5.8, y, w: 0.7, h: 0.34, size: 12, bold: true, color: C.dark, fill: n[1], ft: show ? 0 : 80, shape: deck.pres.shapes.ROUNDED_RECTANGLE, rr: 0.2, align: 'center', valign: 'middle', name: '!!nb' + j });
          s.text(n[2], { x: 6.65, y, w: 6.3, h: 0.34, size: 15, color: show ? C.txt : C.dim, valign: 'middle', name: '!!nt' + j });
        });
      },
    });
  }
  await quiz(deck, 'ce3d', {
    kicker: 'Prüfungsfrage 2.6.01-209', q: 'Woran können Sie erkennen, wann Ihr Fahrzeug zur nächsten Sicherheitsprüfung vorgeführt werden muss?', size: 30,
    opts: ['Am SP-Schild mit der Prüfmarke', 'An der Eintragung in der Zulassungsbescheinigung Teil I', 'An der Prüfplakette auf dem amtlichen Kennzeichen'], ok: [0],
    why: 'Die Plakette am Kennzeichen gilt für die HU. Für die SP gibt es das SP-Schild mit Prüfmarke.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.01-209: A. § 29 Abs. 2 StVZO.\n➜ „Zum Abschluss von CE3: Mitschreiben.“',
  });

  // ===== ABSCHLUSS CE3 =====
  write(deck, 'ce3e', {
    ttl: 'Lastzugbremsen', labelW: 2.9, size: 17,
    rows: [
      ['Grundsatz', 'jedes Fahrzeug bremst sein eigenes Gewicht · Voreilung stellt die Werkstatt ein'],
      ['Falsch abgestimmt', 'Lkw bremst stärker → Anhänger schiebt → Einknicken auf Glätte'],
      ['Lastanpassung', 'misst am Luftbalg (oder Federweg) · kennt nur das Gewicht, nicht die Glätte'],
      ['ABS-Stecker', 'fehlt er: kein ABS, keine Lastanpassung, kein Kippschutz · nur gelb'],
      ['Warnleuchte', 'ohne Stecker oft dunkel → nach dem Kuppeln hinsehen'],
      ['Feststellbremse', 'Lkw mit Federkraft · Anhänger nur mit Luft · Kontrollstellung: Lkw allein, 12 %'],
      ['Dauerbremse', 'nur Antriebsachse · bei Glätte aus oder schwach'],
      ['Anhänger über 10 t', 'HU alle 12 Monate · ab dem 3. Jahr SP dazwischen · UVV jährlich'],
    ],
    notes: '▶ Sagen: „Schreibt euch das auf – das sind die Kernpunkte aus CE3.“\n🖱 Klick 1–8: je eine Zeile.\n💡 Erst das Stichwort vorlesen und fragen: „Wer weiß es?“ – dann klicken.\n✅ Quellen: WABCO EBS3 und TEBS E; Prüfungsfragen 2.7.06-108, -210, -314, -315, -320, -321, -230; RL 71/320/EWG Anhang II; StVZO Anlage VIII; DGUV Vorschrift 70 § 57.\n➜ „Drei Prüfungsfragen.“',
  });
  await quiz(deck, 'ce3e', {
    kicker: 'Prüfungsfrage 2.7.02-305', q: 'Die elektrischen Verbindungen zu Ihrem Zugfahrzeug sind unterbrochen. Welche Einrichtung am Anhänger ist somit nicht betriebsfähig?', size: 28,
    opts: ['Der Automatische Blockierverhinderer (ABV)', 'Das Elektronische Bremssystem (EBS)', 'Die Antriebs-Schlupfregelung (ASR)'], ok: [0, 1],
    why: 'ABS und EBS brauchen Strom und Daten aus dem Stecker. Eine ASR hat der Anhänger nicht – er hat keinen Antrieb.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.7.02-305: A und B.\n➜ „Nächste Frage.“',
  });
  await quiz(deck, 'ce3e', {
    kicker: 'Prüfungsfrage 2.2.23-201', q: 'Was ist zu tun, um einen zweiachsigen Lkw in starkem Gefälle gegen Wegrollen zu sichern?', size: 32,
    opts: ['Feststellbremse anziehen', 'Unterlegkeil vor ein Hinterrad legen', 'Dauerbremse betätigen'], ok: [0, 1],
    why: 'Die Dauerbremse hält nichts fest – sie wirkt nur, wenn sich die Räder drehen.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.2.23-201: A und B. Prüfungsfrage 2.7.06-239: Die Dauerbremse bremst nicht bis zum Stillstand.\n➜ „Letzte Frage.“',
  });
  await quiz(deck, 'ce3e', {
    kicker: 'Prüfungsfrage 2.6.01-207', q: 'Sie sollen einen Anhänger mit einer zulässigen Gesamtmasse von 18 t zur Hauptuntersuchung vorführen. Welche Fahrzeugdokumente benötigen Sie?', size: 28,
    opts: ['Zulassungsbescheinigung Teil I (Fahrzeugschein)', 'Prüfbuch', 'Zulassungsbescheinigung Teil II (Fahrzeugbrief)'], ok: [0, 1],
    why: 'So steht es im Katalog: Fahrzeugschein und Prüfbuch. Den Fahrzeugbrief braucht ihr nicht.',
    notes: '▶ Frage vorlesen, abstimmen.\n🖱 Klick 1: Antworten · Klick 2: Lösung.\n✅ Amtlicher Fragenkatalog 2.6.01-207: A und B.\n💡 „Prüfbuch“ ist der Begriff aus dem Fragenkatalog. Im heutigen § 29 StVZO heißen die Nachweise Untersuchungsbericht (HU) und Prüfprotokoll (SP).\n➜ „Das nimmst du aus CE3 mit.“',
  });
  await takeaway(deck, 'ce3e', {
    items: [
      ['LuScale', 'Jeder bremst sich selbst:', 'Lkw und Anhänger bremsen ihr eigenes Gewicht. Schiebt der Anhänger, droht Einknicken.'],
      ['LuPlug', 'Stecker nie vergessen:', 'ohne ABS-Stecker kein ABS am Anhänger – und oft keine Warnung. Hinsehen!'],
      ['LuCircleParking', 'Kontrollstellung:', 'Hält der Lkw den Zug allein? Dann Anhänger-Feststellbremse und Keile.'],
      ['LuSnowflake', 'Dauerbremse bei Glätte:', 'aus oder nur schwach – sie bremst nur die Antriebsachse.'],
      ['LuCalendarCheck', 'Anhänger über 10 t:', 'HU jedes Jahr, ab dem 3. Jahr SP dazwischen, UVV jährlich.'],
    ],
    notes: '▶ Sagen: „Das sind die fünf Punkte aus CE3, die ihr sicher wissen müsst.“\n🖱 Klick 1–5: je ein Punkt.\n➜ „Jetzt 15 Minuten Pause. Danach CE4: Fahren mit dem Zug.“',
  });
  {
    const s = base(deck, 'ce3e', { bg: 'f_pause.jpg', ov: 8.5, footer: false, transition: 'black', notes:
      '▶ Sagen: „15 Minuten Pause. Kurz raus, frische Luft.“\n' +
      '💡 Pausenende ansagen (z. B. 19:45 Uhr).\n' +
      '🖱 Keine Klicks.\n' +
      '➜ „Willkommen zurück. Lektion CE4: Fahren mit dem Zug – Einknicken, Rückwärtsfahren, Abbiegen und Wetter.“' });
    s.text('PAUSE', { x: 0.7, y: 2.0, w: 6, h: 0.5, size: 18, bold: true, color: C.bl, cs: 6 }, { fx: 'fade', auto: true, dur: 600 });
    s.text('15 Minuten', { x: 0.7, y: 2.5, w: 6.5, h: 1.4, size: 72, bold: true, color: C.txt }, { fx: 'rise', auto: true, dur: 900, d: 200 });
    s.text('Kurz raus, frische Luft.', { x: 0.7, y: 4.0, w: 6.2, h: 0.9, size: 22, color: C.mut }, { fx: 'fade', auto: true, dur: 700, d: 600 });
    s.text('Danach: Lektion CE4 · Fahren mit Zügen', { x: 0.7, y: 5.4, w: 6.2, h: 0.9, size: 16, color: C.bl }, { fx: 'fade', auto: true, dur: 700, d: 900 });
  }
};
