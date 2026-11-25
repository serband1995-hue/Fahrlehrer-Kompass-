// Erinnerungs-Mail (W15 Schritt 5): reine Funktionen, keine Deno-/Node-APIs. Geladen von index.ts (Deno) und den Tests (Node).
// Erinnerung an eine Frist ohne Zahlung: Theorie, Praxisprüfung nach bestandener Theorie, Führerscheinantrag, Frist der
// Führerscheinstelle, Umschreiber. Der Satz kommt aus den Nachrichten-Vorlagen der Fahrschule (vorlagen.js = Kopie von
// kompass-vorlagen.js, Byte für Byte gleich; die Vorschau im Büro nutzt dieselbe Datei). Betreff fest, nie Name im Betreff.
import "./vorlagen.js";
const KV = /** @type {any} */ (globalThis).KV;

/** @typedef {{modus?:string, art:string, vorlage_art:string, vorlage?:{text?:string,text_eltern?:string}|null, frist_am?:string|null, tage?:number|null, schueler_name?:string, an?:string, fahrschule?:string, impressum?:string|null}} ErinnerungDaten */

export const STANDARD_FAHRSCHULE = "Fahrschule Boost";
export const ABSENDER_ADRESSE = "termine@fahr-akademie.info";
const ERLAUBT = ["erinnerung_theorie", "erinnerung_praxis", "erinnerung_antrag", "erinnerung_behoerde", "erinnerung_umschreiber"];
const BETREFF = {
  erinnerung_theorie: "Erinnerung: Theorieunterricht",
  erinnerung_praxis: "Erinnerung: Praktische Prüfung",
  erinnerung_antrag: "Erinnerung: Führerscheinantrag",
  erinnerung_behoerde: "Erinnerung: Frist der Führerscheinstelle",
  erinnerung_umschreiber: "Erinnerung: Führerschein-Umschreibung",
};
const FRIST_TEXT = {
  erinnerung_theorie: "Theorieunterricht gilt bis",
  erinnerung_praxis: "Praktische Prüfung bestehen bis",
  erinnerung_antrag: "Antrag gilt bis",
  erinnerung_behoerde: "Theorieprüfung bestehen bis",
  erinnerung_umschreiber: "Ausländischer Führerschein gilt bis",
};

/** @param {unknown} s */
export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function einzeilig(s) { return String(s == null ? "" : s).replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim(); }
function kuerze(s, n) { const a = Array.from(s); return a.length > n ? a.slice(0, n).join("") : s; }
/** Welche Vorlage: nur die vom Server erlaubten Arten (sonst Fehler, lieber keine Mail als eine falsche). */
export function vorlageArt(d) {
  if (!d || !ERLAUBT.includes(d.vorlage_art)) throw new Error("Vorlage unbekannt");
  return d.vorlage_art;
}
/** Fahrschulname für Absender/Betreff säubern (keine <>",; Zeilenumbrüche). */
export function fahrschulName(d) {
  const n = einzeilig(String(d && d.fahrschule || "").replace(/[<>",;]/g, " "));
  return kuerze(einzeilig(n), 60) || STANDARD_FAHRSCHULE;
}
export function absender(d) { return fahrschulName(d) + " <" + ABSENDER_ADRESSE + ">"; }
/** Betreff: fest je Art, nie Name oder Vorlagentext. */
export function betreff(d) {
  return (d.modus === "test" ? "[TEST] " : "") + fahrschulName(d) + ": " + BETREFF[vorlageArt(d)];
}
function vorname(d) { return einzeilig(d.schueler_name).split(" ")[0]; }
function anrede(d) {
  if (d.an === "eltern" || d.an === "beide") return "Guten Tag,";
  const v = vorname(d);
  return v ? "Hallo " + v + "," : "Hallo,";
}
function echtAn(d) { return d.an === "eltern" ? "die Eltern" : d.an === "beide" ? "Schüler und Eltern" : "den Schüler"; }
/** Satz aus der Vorlage (Eltern lesen mit: eigener Text). @param {ErinnerungDaten} d */
export function satz(d) {
  const art = vorlageArt(d), v = vorname(d);
  return KV.fuelle(KV.textFuer(KV.vorlageAus(art, d.vorlage), d.an, v), { Vorname: v, Datum: d.frist_am, Tage: d.tage, Fahrschule: fahrschulName(d) });
}
function fristZeile(d) {
  const datum = KV.datumText(d.frist_am);
  return datum ? [FRIST_TEXT[vorlageArt(d)], datum] : null;
}
/** Klartext-Fassung. @param {ErinnerungDaten} d */
export function mailText(d) {
  const z = [];
  if (d.modus === "test") z.push("TEST-MAIL", "Im Echt-Modus geht diese Mail an " + echtAn(d) + ".", "");
  z.push(anrede(d), "", satz(d), "");
  const f = fristZeile(d);
  if (f) z.push(f[0] + ": " + f[1], "");
  if (d.impressum) z.push("--", String(d.impressum).trim());
  z.push("", "Diese Mail wurde vom Büro der Fahrschule verschickt.");
  return z.join("\n");
}
/** HTML-Mail: Tabellen-Layout, nur Inline-Styles, keine Bilder. @param {ErinnerungDaten} d */
export function mailHtml(d) {
  const font = "font-family:-apple-system,'Segoe UI',Arial,sans-serif;";
  const test = d.modus === "test"
    ? `<tr><td style="${font}background:#fff3b0;border:2px solid #d9b800;padding:14px;font-size:17px;font-weight:700;color:#5a4a00;text-align:center;">Test-Mail<div style="font-size:14px;font-weight:600;margin-top:6px;">Im Echt-Modus geht diese Mail an ${esc(echtAn(d))}.</div></td></tr><tr><td style="height:12px;line-height:12px;font-size:12px;">&nbsp;</td></tr>`
    : "";
  const f = fristZeile(d);
  const kasten = f ? `<tr><td style="padding:0 0 18px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e8f1ea;border-radius:10px;"><tr><td style="padding:18px;text-align:center;">
    <div style="${font}font-size:15px;color:#2a2a24;">${esc(f[0])}</div>
    <div style="${font}font-size:30px;line-height:1.2;font-weight:800;color:#2f6244;margin-top:4px;">${esc(f[1])}</div>
  </td></tr></table></td></tr>` : "";
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
${kasten}
<tr><td style="padding:6px 0 0 0;">
  ${impressum}
  <div style="${font}font-size:13px;color:#6a6a60;">Diese Mail wurde vom Büro der Fahrschule verschickt.</div>
</td></tr>
</table></td></tr></table></body></html>`;
}
