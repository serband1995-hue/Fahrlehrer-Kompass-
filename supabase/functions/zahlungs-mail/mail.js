// Zahlungs-Mail: reine Funktionen (keine Deno-/Node-APIs ausser CompressionStream und btoa, die es in beiden gibt).
// Wird von index.ts (Deno) und scripts/zahlungsmail-mail-test.mjs (Node) geladen.
// Enthält: Betrag/EPC-Text/PayPal-Link, Betreff, HTML- und Text-Mail, eigener QR-Encoder (Byte-Modus, Fehlerkorrektur M) und PNG-Writer.
// W15 S4: Der Satz der Mail kommt aus den Nachrichten-Vorlagen der Fahrschule (vorlagen.js = Kopie von kompass-vorlagen.js,
// Byte für Byte gleich; die Vorschau im Büro nutzt dieselbe Datei). Ohne Vorlage: die Standard-Sätze (= die von vorher).
import "./vorlagen.js";
const KV = /** @type {any} */ (globalThis).KV;

/** @typedef {{modus?:string, art:string, vorlage_art?:string, vorlage?:{text?:string,text_eltern?:string}|null, faellig_am?:string|null, tage?:number|null, betrag_cent:number, wofuer:string, verwendungszweck?:string, schueler_name?:string, an?:string, fahrschule?:string, kontoinhaber?:string, iban?:string, bic?:string|null, paypal?:string|null, impressum?:string|null}} MailDaten */

export const STANDARD_FAHRSCHULE = "Fahrschule Boost";
export const ABSENDER_ADRESSE = "termine@fahr-akademie.info";

// ---------- Kleinkram ----------
/** @param {unknown} s */
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
/** Ein Feld einzeilig machen (für EPC, Betreff, Absendername). @param {unknown} s */
function einzeilig(s) {
  return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim();
}
/** Auf höchstens n Zeichen (Codepoints) kürzen. */
function kuerze(s, n) {
  const a = Array.from(s);
  return a.length > n ? a.slice(0, n).join("") : s;
}
const utf8Len = (s) => new TextEncoder().encode(s).length;

/** 12000 -> "120,00 €" (deutsch, Tausenderpunkt). @param {number} cent */
export function betragText(cent) {
  const c = Math.round(Number(cent) || 0);
  const neg = c < 0;
  const a = Math.abs(c);
  const euro = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + euro + "," + String(a % 100).padStart(2, "0") + " €";
}
/** 12000 -> "120.00" */
export function betragPunkt(cent) {
  const c = Math.round(Number(cent) || 0);
  return Math.floor(c / 100) + "." + String(c % 100).padStart(2, "0");
}
/** IBAN in 4er-Gruppen. @param {string} iban */
export function ibanGruppiert(iban) {
  return String(iban || "").replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
}

// ---------- GiroCode (EPC069-12, Version 002) ----------
/**
 * @param {{kontoinhaber:string, iban:string, bic?:string|null, betrag_cent:number, verwendungszweck?:string}} d
 */
export function epcText(d) {
  const name = kuerze(einzeilig(d.kontoinhaber), 70);
  const iban = String(d.iban || "").replace(/\s+/g, "").toUpperCase();
  const bic = String(d.bic || "").replace(/\s+/g, "").toUpperCase();
  const cent = Math.round(Number(d.betrag_cent) || 0);
  if (!(cent >= 1 && cent <= 99999999999)) throw new Error("EPC: Betrag ausserhalb 0,01 bis 999.999.999,99");
  let zweck = kuerze(einzeilig(d.verwendungszweck), 140);
  const bauen = () => ["BCD", "002", "1", "SCT", bic, name, iban, "EUR" + betragPunkt(cent), "", "", zweck].join("\n");
  let t = bauen();
  // Gesamtlänge höchstens 331 Byte (Umlaute zählen mehr als 1 Byte): Zweck kürzen
  while (utf8Len(t) > 331 && zweck.length > 0) {
    zweck = Array.from(zweck).slice(0, -1).join("");
    t = bauen();
  }
  if (utf8Len(t) > 331) throw new Error("EPC: zu lang");
  return t;
}

/** @param {string|null|undefined} name @param {number} cent */
export function paypalLink(name, cent) {
  const n = String(name || "").trim();
  if (!n) return null;
  return "https://www.paypal.me/" + encodeURIComponent(n) + "/" + betragPunkt(cent) + "EUR";
}

// ---------- Texte ----------
const BETREFF = {
  pruefung: "Zahlungsinformation zu Ihrer Prüfung",
  reaktivierung: "Zahlungsinformation: Reaktivierung",
  zahlung_offen: "Wichtige Information zu Ihren Terminen",
};
// W15 S4: Erinnerung, bevor die Reaktivierung fällig wird (vorlage_art vom Server; die Art der Spur bleibt „reaktivierung“)
const BETREFF_BALD = "Erinnerung: Reaktivierung";

/** Fahrschulname für Absender/Betreff säubern (keine <>",; Zeilenumbrüche). */
export function fahrschulName(d) {
  const n = einzeilig(String(d && d.fahrschule || "").replace(/[<>",;]/g, " "));
  return kuerze(einzeilig(n), 60) || STANDARD_FAHRSCHULE;
}
export function absender(d) {
  return fahrschulName(d) + " <" + ABSENDER_ADRESSE + ">";
}
/** Betreff: nie Betrag, IBAN oder Name. */
export function betreff(d) {
  let text = BETREFF[d.art];
  if (!text) throw new Error("Art unbekannt");
  if (d.an === "eltern" || d.an === "beide") text = BETREFF_ELTERN[d.art];
  if (d.art === "reaktivierung" && d.vorlage_art === "reaktivierung_bald") text = BETREFF_BALD;
  return (d.modus === "test" ? "[TEST] " : "") + fahrschulName(d) + ": " + text;
}
// W14: d.an = wer angeschrieben wird ("schueler" | "eltern" | "beide"; fehlt = Schüler, wie bisher)
function vorname(d) { return einzeilig(d.schueler_name).split(" ")[0]; }
function anrede(d) {
  const v = vorname(d);
  if (d.an === "eltern") return "Guten Tag,";
  if (d.an === "beide") return "Guten Tag,"; // Eltern lesen mit: neutral, dann „… von Lena“
  return v ? "Hallo " + v + "," : "Hallo,";
}
// W15 S4: Satz aus der Vorlage (Eltern lesen mit: eigener Text, z. B. „die Prüfung von <Vorname>“). Welche Vorlage, bestimmt
// der Server (vorlage_art; z. B. reaktivierung_bald vor der Fälligkeit). Fremde vorlage_art = die der Art.
/** @param {MailDaten} d */
export function satz(d) {
  const art = d.vorlage_art && KV.VORLAGEN[d.vorlage_art] && (d.vorlage_art === d.art || (d.art === "reaktivierung" && d.vorlage_art === "reaktivierung_bald")) ? d.vorlage_art : d.art;
  const vorlage = KV.vorlageAus(art, d.vorlage);
  if (!vorlage) return "";
  const v = vorname(d);
  return KV.fuelle(KV.textFuer(vorlage, d.an, v), { Vorname: v, Datum: d.faellig_am, Tage: d.tage, Betrag: d.betrag_cent, Fahrschule: fahrschulName(d) });
}
// Fälligkeit der Reaktivierung (nur wenn der Server sie mitschickt): „Fällig am“ (bald) oder „Fällig seit“ (überfällig)
function faelligZeile(d) {
  if (d.art !== "reaktivierung" || !d.faellig_am) return null;
  const datum = KV.datumText(d.faellig_am);
  if (!datum) return null;
  return [d.vorlage_art === "reaktivierung_bald" ? "Fällig am" : "Fällig seit", datum];
}
// Test-Mail: an wen sie im Echt-Modus ginge
function echtAn(d) { return d.an === "eltern" ? "die Eltern" : d.an === "beide" ? "Schüler und Eltern" : "den Schüler"; }
// Betreff, wenn Eltern mitlesen: ohne „Ihre“, weiter ohne Namen (Regel oben: nie Betrag, IBAN oder Name)
const BETREFF_ELTERN = {
  pruefung: "Zahlungsinformation zur Prüfung",
  reaktivierung: "Zahlungsinformation: Reaktivierung",
  zahlung_offen: "Wichtige Information zu den Fahrstunden",
};

/** Klartext-Fassung. @param {MailDaten} d */
export function mailText(d) {
  const z = [];
  if (d.modus === "test") z.push("TEST-MAIL - NICHT BEZAHLEN", "");
  if (d.modus === "test" && d.an) z.push("Im Echt-Modus geht diese Mail an " + echtAn(d) + ".", "");
  z.push(anrede(d), "", satz(d), "");
  z.push("Betrag: " + betragText(d.betrag_cent), "Wofür: " + einzeilig(d.wofuer));
  const fz = faelligZeile(d);
  if (fz) z.push(fz[0] + ": " + fz[1]);
  z.push("");
  z.push("PER ÜBERWEISUNG", "Kontoinhaber: " + einzeilig(d.kontoinhaber), "IBAN: " + ibanGruppiert(d.iban || ""));
  if (d.bic) z.push("BIC: " + einzeilig(d.bic));
  z.push("Betrag: " + betragText(d.betrag_cent), "Verwendungszweck: " + einzeilig(d.verwendungszweck), "");
  z.push("Am Handy: IBAN kopieren und in die Banking-App einfügen. Am Computer: den GiroCode im Anhang (girocode.png) mit der Banking-App scannen, dann ist alles ausgefüllt.", "");
  const pp = paypalLink(d.paypal, d.betrag_cent);
  if (pp) z.push("PER PAYPAL", pp, "Bitte bei PayPal als Nachricht schreiben: " + einzeilig(d.verwendungszweck || ""), "");
  if (d.impressum) z.push("--", String(d.impressum).trim());
  z.push("", "Diese Mail wurde vom Büro der Fahrschule verschickt.");
  return z.join("\n");
}

/** HTML-Mail: Tabellen-Layout, nur Inline-Styles, keine externen Bilder. @param {MailDaten} d */
export function mailHtml(d) {
  const font = "font-family:-apple-system,'Segoe UI',Arial,sans-serif;";
  const zeile = (k, v) => `<tr><td style="${font}padding:6px 10px 6px 0;font-size:13px;color:#5a5a50;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="${font}padding:6px 0;font-size:16px;color:#2a2a24;font-weight:700;word-break:break-word;">${v}</td></tr>`;
  const test = d.modus === "test"
    ? `<tr><td style="${font}background:#fff3b0;border:2px solid #d9b800;padding:14px;font-size:17px;font-weight:700;color:#5a4a00;text-align:center;">Test-Mail – nicht bezahlen${d.an ? `<div style="font-size:14px;font-weight:600;margin-top:6px;">Im Echt-Modus geht diese Mail an ${esc(echtAn(d))}.</div>` : ""}</td></tr><tr><td style="height:12px;line-height:12px;font-size:12px;">&nbsp;</td></tr>`
    : "";
  const pp = paypalLink(d.paypal, d.betrag_cent);
  const paypalBlock = pp
    ? `<tr><td style="padding:0 0 18px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #dcd8c8;border-radius:10px;"><tr><td style="padding:18px;">
          <div style="${font}font-size:18px;font-weight:700;color:#2a2a24;margin:0 0 10px;">Per PayPal</div>
          <a href="${esc(pp)}" style="${font}display:block;text-align:center;background:#0070ba;color:#ffffff;text-decoration:none;font-weight:700;font-size:18px;padding:16px 12px;border-radius:10px;">Jetzt mit PayPal zahlen</a>
          <div style="${font}font-size:14px;color:#5a5a50;margin-top:8px;">Bitte bei PayPal als Nachricht schreiben: ${esc(d.verwendungszweck || "")}</div>
        </td></tr></table></td></tr>`
    : "";
  const impressum = d.impressum ? `<div style="${font}font-size:13px;color:#6a6a60;line-height:1.5;margin:0 0 10px;">${esc(String(d.impressum).trim()).replace(/\r?\n/g, "<br>")}</div>` : "";
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(betreff(d))}</title></head>
<body style="margin:0;padding:0;background:#f3f1e9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f1e9;"><tr><td align="center" style="padding:16px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
${test}
<tr><td style="${font}font-size:16px;line-height:1.5;color:#2a2a24;padding:0 0 14px 0;">
  <p style="margin:0 0 12px;">${esc(anrede(d))}</p>
  <p style="margin:0;">${esc(satz(d)).replace(/\n/g, "<br>")}</p>
</td></tr>
<tr><td style="padding:0 0 18px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8f1ea;border-radius:10px;"><tr><td style="padding:18px;text-align:center;">
    <div style="${font}font-size:38px;line-height:1.2;font-weight:800;color:#2f6244;">${esc(betragText(d.betrag_cent))}</div>
    <div style="${font}font-size:16px;color:#2a2a24;margin-top:8px;">Wofür: ${esc(d.wofuer)}</div>
    ${faelligZeile(d) ? `<div style="${font}font-size:16px;color:#2a2a24;margin-top:4px;">${esc(faelligZeile(d)[0])}: <b>${esc(faelligZeile(d)[1])}</b></div>` : ""}
  </td></tr></table>
</td></tr>
<tr><td style="padding:0 0 18px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #dcd8c8;border-radius:10px;"><tr><td style="padding:18px;">
    <div style="${font}font-size:18px;font-weight:700;color:#2a2a24;margin:0 0 8px;">Per Überweisung</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${zeile("Kontoinhaber", esc(d.kontoinhaber))}
      ${zeile("IBAN", esc(ibanGruppiert(d.iban || "")))}
      ${d.bic ? zeile("BIC", esc(d.bic)) : ""}
      ${zeile("Betrag", esc(betragText(d.betrag_cent)))}
      ${zeile("Verwendungszweck", esc(d.verwendungszweck))}
    </table>
    <div style="text-align:center;padding:16px 0 4px;">
      <img src="cid:girocode" width="160" height="160" alt="GiroCode">
      <div style="${font}font-size:14px;color:#5a5a50;margin-top:8px;">Am Handy: IBAN gedrückt halten und kopieren. Am Computer: Code mit der Banking-App scannen, dann ist alles ausgefüllt.</div>
    </div>
  </td></tr></table>
</td></tr>
${paypalBlock}
<tr><td style="padding:6px 0 0 0;">
  ${impressum}
  <div style="${font}font-size:13px;color:#6a6a60;">Diese Mail wurde vom Büro der Fahrschule verschickt.</div>
</td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- QR-Code (Byte-Modus, Fehlerkorrektur M, Version 1 bis 13) ----------
// Je Version: Fehlerkorrektur-Bytes pro Block und Blöcke [Anzahl, Datenbytes] (Tabelle ISO 18004, Stufe M).
const M_TABELLE = [null,
  [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]], [16, [[4, 27]]],
  [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]],
  [30, [[1, 50], [4, 51]]], [22, [[6, 36], [2, 37]]], [22, [[8, 37], [1, 38]]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54], [6, 32, 58], [6, 34, 62]];

const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
(() => { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; })();
const gmul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

function rsGenerator(deg) {
  let g = [1];
  for (let i = 0; i < deg; i++) {
    const n = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { n[j] ^= g[j]; n[j + 1] ^= gmul(g[j], EXP[i]); }
    g = n;
  }
  return g; // höchster Grad zuerst
}
function rsRest(data, deg) {
  const g = rsGenerator(deg);
  const r = new Array(deg).fill(0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    if (f) for (let i = 0; i < deg; i++) r[i] ^= gmul(g[i + 1], f);
  }
  return r;
}

function dataBytes(v) { return M_TABELLE[v][1].reduce((s, [n, k]) => s + n * k, 0); }

/** @param {Uint8Array} bytes @returns {number[][]} Matrix [y][x] 0/1 */
export function qrMatrix(bytes) {
  let v = 1;
  for (; v <= 13; v++) { const kopf = v < 10 ? 12 : 20; if (Math.ceil((kopf + bytes.length * 8) / 8) <= dataBytes(v)) break; }
  if (v > 13) throw new Error("QR: Text zu lang (mehr als 331 Byte)");
  const total = dataBytes(v);
  // Bitstrom
  const bits = [];
  const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  for (let i = 0; i < 4 && bits.length < total * 8; i++) bits.push(0);
  while (bits.length % 8) bits.push(0);
  const cw = [];
  for (let i = 0; i < bits.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
  for (let p = 0; cw.length < total; p++) cw.push(p % 2 ? 0x11 : 0xec);
  // Blöcke + Fehlerkorrektur
  const [ec, gruppen] = M_TABELLE[v];
  const bloecke = []; let pos = 0;
  for (const [n, k] of gruppen) for (let i = 0; i < n; i++) { const dat = cw.slice(pos, pos + k); pos += k; bloecke.push({ dat, ecc: rsRest(dat, ec) }); }
  const maxK = Math.max(...bloecke.map((b) => b.dat.length));
  const fin = [];
  for (let i = 0; i < maxK; i++) for (const b of bloecke) if (i < b.dat.length) fin.push(b.dat[i]);
  for (let i = 0; i < ec; i++) for (const b of bloecke) fin.push(b.ecc[i]);

  const size = 17 + 4 * v;
  const mod = Array.from({ length: size }, () => new Array(size).fill(0));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dunkel) => { if (x >= 0 && y >= 0 && x < size && y < size) { mod[y][x] = dunkel ? 1 : 0; fn[y][x] = true; } };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const d = Math.max(Math.abs(dx), Math.abs(dy)); set(cx + dx, cy + dy, d !== 2 && d !== 4); } };
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  const al = ALIGN[v];
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const formatBits = (mask) => {
    const data = (0 << 3) | mask; // Stufe M = 00
    let rem = data << 10;
    for (let i = 4; i >= 0; i--) if ((rem >>> (i + 10)) & 1) rem ^= 0x537 << i;
    return ((data << 10) | rem) ^ 0x5412;
  };
  const zeichneFormat = (mask) => {
    const b = formatBits(mask), bit = (i) => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  zeichneFormat(0);
  if (v >= 7) {
    let rem = v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const b = (v << 12) | rem;
    for (let i = 0; i < 18; i++) { const c = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), k = Math.floor(i / 3); set(a, k, c); set(k, a, c); }
  }
  // Daten im Zickzack
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y][x] && bi < fin.length * 8) { mod[y][x] = (fin[bi >>> 3] >>> (7 - (bi & 7))) & 1; bi++; }
    }
  }
  const MASKEN = [
    (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x, y) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const maskeAnwenden = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKEN[m](x, y)) mod[y][x] ^= 1; };
  const strafe = () => {
    let p = 0, dunkel = 0;
    const MUSTER = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], MUSTER_R = MUSTER.slice().reverse();
    for (let a = 0; a < size; a++) for (const zeile of [true, false]) {
      const get = (i) => (zeile ? mod[a][i] : mod[i][a]);
      let lauf = 1;
      for (let i = 1; i < size; i++) { if (get(i) === get(i - 1)) { lauf++; if (lauf === 5) p += 3; else if (lauf > 5) p++; } else lauf = 1; }
      for (let i = 0; i + 11 <= size; i++) {
        let g1 = true, g2 = true;
        for (let k = 0; k < 11; k++) { const w = get(i + k); if (w !== MUSTER[k]) g1 = false; if (w !== MUSTER_R[k]) g2 = false; }
        if (g1) p += 40; if (g2) p += 40;
      }
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      if (mod[y][x]) dunkel++;
      if (x + 1 < size && y + 1 < size && mod[y][x] === mod[y][x + 1] && mod[y][x] === mod[y + 1][x] && mod[y][x] === mod[y + 1][x + 1]) p += 3;
    }
    const k = Math.ceil(Math.abs(dunkel * 20 - size * size * 10) / (size * size)) - 1;
    return p + k * 10;
  };
  let beste = 0, besteStrafe = Infinity;
  for (let m = 0; m < 8; m++) {
    maskeAnwenden(m); zeichneFormat(m);
    const s = strafe();
    if (s < besteStrafe) { besteStrafe = s; beste = m; }
    maskeAnwenden(m);
  }
  maskeAnwenden(beste); zeichneFormat(beste);
  return mod;
}

// ---------- PNG ----------
const CRC_TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

async function zlib(daten) {
  const cs = new CompressionStream("deflate"); // zlib-Format
  const w = cs.writable.getWriter();
  w.write(daten); w.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

/** Text -> PNG (Graustufen, 1 Bit, Ruhezone 4 Module). @param {string} text @returns {Promise<Uint8Array>} */
export async function qrPng(text) {
  const m = qrMatrix(new TextEncoder().encode(text));
  const n = m.length, rand = 4, module = n + 2 * rand;
  const s = Math.max(3, Math.round(290 / module)); // Pixel je Modul: etwa 240 bis 330 px
  const px = module * s, zb = Math.ceil(px / 8);
  const roh = new Uint8Array((zb + 1) * px).fill(0xff); // Filter 0 + weiss
  for (let y = 0; y < px; y++) {
    roh[y * (zb + 1)] = 0;
    const my = Math.floor(y / s) - rand;
    if (my < 0 || my >= n) continue;
    for (let x = 0; x < px; x++) {
      const mx = Math.floor(x / s) - rand;
      if (mx >= 0 && mx < n && m[my][mx]) roh[y * (zb + 1) + 1 + (x >> 3)] &= ~(0x80 >> (x & 7));
    }
  }
  const chunk = (typ, daten) => {
    const out = new Uint8Array(12 + daten.length), dv = new DataView(out.buffer);
    dv.setUint32(0, daten.length);
    for (let i = 0; i < 4; i++) out[4 + i] = typ.charCodeAt(i);
    out.set(daten, 8);
    dv.setUint32(8 + daten.length, crc32(out.subarray(4, 8 + daten.length)));
    return out;
  };
  const ihdr = new Uint8Array(13), dv = new DataView(ihdr.buffer);
  dv.setUint32(0, px); dv.setUint32(4, px); ihdr[8] = 1; ihdr[9] = 0; // 1 Bit, Graustufen
  const teile = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", await zlib(roh)), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(teile.reduce((a, t) => a + t.length, 0));
  let o = 0; for (const t of teile) { png.set(t, o); o += t.length; }
  return png;
}

/** Base64 ohne Buffer (in Stücken, damit btoa nicht an der Argumentgrenze scheitert). @param {Uint8Array} bytes */
export function base64(bytes) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)));
  return btoa(s);
}
