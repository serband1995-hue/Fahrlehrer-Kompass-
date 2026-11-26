// W15 Schritt 4: zahlungs_mail_vorbereiten mit Nachrichten-Vorlagen und Fälligkeit der Reaktivierung, in echtem Postgres
// (PGlite, läuft in Node, ohne Netz, erfundene Daten). Spielt K8, K9, Zahlungs-Mail (zm_01), W14 (Eltern), W11 (Einstellungen),
// W15 S1–S4 gegen eine kleine Attrappe ein und prüft:
// - Reaktivierung nur, wenn sie ansteht (gleiche Regel wie KR.reaktInfo in Büro und App: überfällig oder in der Vorwarnzeit),
//   nie bei befreit oder „entfällt“; vor der Fälligkeit Vorlage „reaktivierung_bald“.
// - Vorlagen aus den Einstellungen (nur Texte, gekürzt), Fälligkeit und Tage; alles Bisherige (Empfänger, Limit) bleibt.
// - Die Mail füllt die Vorlage genau wie die Vorschau im Büro (mail.js nutzt dieselbe Datei wie kompass-vorlagen.js).
// - Rückweg (W14-Stand) und erneutes Einspielen.
// Aufruf: NODE_PATH=$(npm root -g) node scripts/vorlagen-sql-test.mjs   (braucht npm i -g @electric-sql/pglite@0.2.17)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KR = require(join(ROOT, "kompass-rechnen.js"));
const KV = require(join(ROOT, "kompass-vorlagen.js"));
const MAIL = await import(pathToFileURL(join(ROOT, "supabase/functions/zahlungs-mail/mail.js")).href);
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i -g @electric-sql/pglite@0.2.17 und mit NODE_PATH=$(npm root -g) starten.");
  process.exit(1);
}
const sql = (name) => readFileSync(join(ROOT, "supabase", name), "utf8");
let faelle = 0, fehler = 0;
const fest = (x) => JSON.stringify(x, (k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((q) => [q, v[q]])) : v));
function gleich(name, erwartet, ist) {
  faelle++;
  const a = fest(erwartet), b = fest(ist);
  if (a !== b) { fehler++; console.log("ABWEICHUNG " + name + "\n  erwartet: " + a + "\n  ist:      " + b); }
}

const db = new PGlite();
const FS = "11111111-1111-4111-8111-111111111111", FS2 = "22222222-2222-4222-8222-222222222222";
const BUERO = "aaaaaaaa-0000-4000-8000-000000000001", FREMD = "aaaaaaaa-0000-4000-8000-000000000002", SA = "aaaaaaaa-0000-4000-8000-000000000003";
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table public.fahrschulen (id uuid primary key, name text);
  create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true, email text, name text);
  create table public.fahrschule_pakete (id uuid primary key default gen_random_uuid(), fahrschule_id uuid);
  create table public.schueler (id text primary key, fahrschule_id uuid, name text not null, telefon text, email text, ausbildung jsonb,
    status text default 'aktiv', reakt_status text default 'pruefen', reakt_bezahlt_bis date, vertrag_am date, inaktiv_seit date);
  create table public.kalender_termine (id text primary key, schueler_id text, datum date, art text, geloescht boolean default false, geloescht_am timestamptz);
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select null::text $$;
  create or replace function public.k5_meine_fahrschule() returns uuid language sql stable security definer set search_path to 'public' as $$
    select p.fahrschule_id from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true) and coalesce(p.rolle, '') not in ('entfernt', '') $$;
  insert into public.fahrschulen values ('${FS}', 'Fahrschule Muster'), ('${FS2}', 'Andere Muster');
  insert into public.profiles values ('${BUERO}', '${FS}', 'buero', true, 'buero@example.org', 'Büro'), ('${FREMD}', '${FS2}', 'buero', true, null, 'Fremd'),
    ('${SA}', null, 'super_admin', true, 'admin@example.org', 'Admin');
`);
for (const m of ["20261123_k8_01_zahlung_sperre", "20261123_k9_01_preisliste", "20261124_zm_01_zahlungsmail", "20261125_w14_02_eltern_mail",
  "20261125_einst_01_fahrschule_einstellungen", "20261126_w15_01_reakt_entfaellt", "20261127_w15_02_fristen_einstellungen"]) await db.exec(sql("migrations/" + m + ".sql"));
await db.exec("alter table public.fahrschule_preise disable trigger fahrschule_preise_schutz");
const S4 = sql("migrations/20261128_w15_03_vorlagen_mail.sql"), RUECK = sql("rueckweg/20261128_w15_03_rueckweg.sql");
const erg = (q) => db.query(q.slice(q.lastIndexOf("select ("))).then((r) => r.rows[0]);
await db.exec(S4);
gleich("Ergebnis-Abfrage", { funktion_neu: true, fuer_angemeldete: true, fuer_anon: false }, await erg(S4));
await db.exec(S4); // zweimal einspielbar

const heute = (await db.query("select (now() at time zone 'Europe/Berlin')::date::text as d")).rows[0].d;
const tag = (n) => KR.addDaysISO(heute, n), monate = (n) => KR.addMonthsISO(heute, n);
async function alsNutzer(uid) { await db.query("select set_config('test.uid', $1, false)", [uid || ""]); }
await alsNutzer(BUERO);
await db.query("insert into public.fahrschule_zahlungsdaten (fahrschule_id, kontoinhaber, iban, modus, test_email) values ($1, 'Fahrschule Muster', 'DE89370400440532013000', 'test', 'test@example.org')", [FS]);
async function schueler(liste) {
  await db.exec("delete from public.zahlungs_mails; delete from public.schueler_eltern; delete from public.schueler;");
  for (const s of liste) await db.query("insert into public.schueler (id, fahrschule_id, name, email, reakt_status, reakt_bezahlt_bis, vertrag_am) values ($1,$2,$3,$4,$5,$6,$7)",
    [s.id, s.fahrschule_id || FS, s.name || "Lena Muster", s.email === undefined ? "lena@example.org" : s.email, s.reakt_status ?? "bezahlt", s.reakt_bezahlt_bis || null, s.vertrag_am || null]);
}
async function einstellung(schluessel, wert) {
  await db.query("delete from public.fahrschule_einstellungen where fahrschule_id = $1 and schluessel = $2", [FS, schluessel]);
  if (wert !== undefined) await db.query("insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values ($1, $2, $3::jsonb)", [FS, schluessel, JSON.stringify(wert)]);
}
async function preise(zeilen) {
  await db.query("delete from public.fahrschule_preise where fahrschule_id = $1", [FS]);
  for (const z of zeilen) await db.query("insert into public.fahrschule_preise (fahrschule_id, art, bezeichnung, einheit, betrag_cent, gueltig_ab, angelegt_am) values ($1,'reaktivierung','Reaktivierung','pauschal',$2,$3,$4)",
    [FS, z.betrag_cent, z.gueltig_ab, z.gueltig_ab + "T10:00:00Z"]);
}
async function vorbereiten(sid, art = "reaktivierung", cent = 24000, wofuer = "Reaktivierung") {
  await db.exec("delete from public.zahlungs_mails");
  return (await db.query("select public.zahlungs_mail_vorbereiten($1, $2, $3, $4) as d", [sid, art, cent, wofuer])).rows[0].d;
}
const kurz = (d) => (d.fehler ? { fehler: d.fehler } : { vorlage_art: d.vorlage_art, faellig_am: d.faellig_am, tage: d.tage, vorlage: d.vorlage ?? null });

// ---------- 1. Prüfung und Zahlung offen: Vorlage, keine Fälligkeit ----------
await schueler([{ id: "p1" }]);
gleich("Prüfung ohne Vorlage", { vorlage_art: "pruefung", faellig_am: null, tage: null, vorlage: null }, kurz(await vorbereiten("p1", "pruefung", 15000, "Praktische Prüfung Klasse B")));
await einstellung("vorlagen.pruefung", { text: "Hallo zusammen, für {Vorname}: {Betrag}", text_eltern: 5, anderes: "x" });
gleich("Prüfung mit Vorlage: nur Texte", { vorlage_art: "pruefung", faellig_am: null, tage: null, vorlage: { text: "Hallo zusammen, für {Vorname}: {Betrag}" } }, kurz(await vorbereiten("p1", "pruefung", 15000, "Prüfung")));
await einstellung("vorlagen.pruefung", { text: "x".repeat(2500) });
gleich("Prüfung: Vorlage auf 2000 Zeichen gekürzt", 2000, (await vorbereiten("p1", "pruefung", 15000, "Prüfung")).vorlage.text.length);
await einstellung("vorlagen.pruefung", undefined);
gleich("bisherige Felder bleiben (Empfänger Test-Adresse, Modus)", { empfaenger: "test@example.org", modus: "test", an: "schueler", art: "pruefung" },
  (({ empfaenger, modus, an, art }) => ({ empfaenger, modus, an, art }))(await vorbereiten("p1", "pruefung", 15000, "Prüfung")));

// ---------- 2. Reaktivierung: nur wenn sie ansteht ----------
await preise([{ betrag_cent: 24000, gueltig_ab: monate(-40) }]);
const FAELLE = [
  ["überfällig (13 Monate nach Vertrag)", { vertrag_am: monate(-13) }, { vorlage_art: "reaktivierung", faellig_am: monate(-1), tage: KR.daysBetweenISO(heute, monate(-1)), vorlage: null }],
  ["noch nicht geprüft, überfällig", { vertrag_am: monate(-13), reakt_status: "pruefen" }, { vorlage_art: "reaktivierung", faellig_am: monate(-1), tage: KR.daysBetweenISO(heute, monate(-1)), vorlage: null }],
  ["fällig heute = bald", { reakt_bezahlt_bis: heute }, { vorlage_art: "reaktivierung_bald", faellig_am: heute, tage: 0, vorlage: null }],
  ["in 20 Tagen = bald", { reakt_bezahlt_bis: tag(20) }, { vorlage_art: "reaktivierung_bald", faellig_am: tag(20), tage: 20, vorlage: null }],
  ["in 60 Tagen (Grenze Vorwarnung)", { reakt_bezahlt_bis: tag(60) }, { vorlage_art: "reaktivierung_bald", faellig_am: tag(60), tage: 60, vorlage: null }],
  ["in 61 Tagen: noch nicht", { reakt_bezahlt_bis: tag(61) }, { fehler: "reakt_nicht_faellig" }],
  ["befreit", { vertrag_am: monate(-13), reakt_status: "befreit" }, { fehler: "reakt_befreit" }],
  ["ohne Vertragsdatum", {}, { fehler: "reakt_ohne_datum" }],
];
for (const [name, s, erwartet] of FAELLE) {
  await schueler([Object.assign({ id: "r1" }, s)]);
  gleich("Reaktivierung " + name, erwartet, kurz(await vorbereiten("r1")));
}
await preise([{ betrag_cent: 24000, gueltig_ab: monate(-40) }, { betrag_cent: null, gueltig_ab: tag(-3) }]);
await schueler([{ id: "r1", vertrag_am: monate(-13) }]);
gleich("Reaktivierung entfällt heute laut Preisliste", { fehler: "reakt_entfaellt" }, kurz(await vorbereiten("r1")));
await preise([{ betrag_cent: null, gueltig_ab: monate(-40) }, { betrag_cent: 24000, gueltig_ab: monate(-6) }]);
gleich("Reaktivierung entfiel am Vertragstag", { fehler: "reakt_entfaellt" }, kurz(await vorbereiten("r1")));
await preise([{ betrag_cent: 24000, gueltig_ab: monate(-40) }]);
// Einstellungen: Vorwarnung, Warnung > Vorwarnung, Monate
await schueler([{ id: "r1", reakt_bezahlt_bis: tag(80) }]);
await einstellung("fristen.reaktivierung", { vorwarn_tage: 90 });
gleich("Vorwarnung 90: in 80 Tagen geht", "reaktivierung_bald", (await vorbereiten("r1")).vorlage_art);
await einstellung("fristen.reaktivierung", { bald_tage: 85, vorwarn_tage: 10 });
gleich("Vorwarnung kürzer als Warnung: Warnung gilt (85)", "reaktivierung_bald", (await vorbereiten("r1")).vorlage_art);
await einstellung("fristen.reaktivierung", { monate: 24 });
await schueler([{ id: "r1", vertrag_am: monate(-13) }]);
gleich("Monate 24: nach 13 Monaten noch nicht", { fehler: "reakt_nicht_faellig" }, kurz(await vorbereiten("r1")));
await schueler([{ id: "r1", vertrag_am: monate(-23) }]);
gleich("Monate 24: Fälligkeit = Vertrag + 24", KR.addMonthsISO(monate(-23), 24), (await vorbereiten("r1")).faellig_am);
await einstellung("fristen.reaktivierung", undefined);
// Vorlage „bald“ und „fällig“ getrennt
await einstellung("vorlagen.reaktivierung_bald", { text: "Bald: {Datum}", text_eltern: "Bald Eltern: {Vorname}" });
await einstellung("vorlagen.reaktivierung", { text: "Fällig: {Datum}" });
await schueler([{ id: "r1", reakt_bezahlt_bis: tag(10) }, { id: "r2", vertrag_am: monate(-13) }]);
gleich("Vorlage bald", { text: "Bald: {Datum}", text_eltern: "Bald Eltern: {Vorname}" }, (await vorbereiten("r1")).vorlage);
gleich("Vorlage fällig", { text: "Fällig: {Datum}" }, (await vorbereiten("r2")).vorlage);
await einstellung("vorlagen.reaktivierung", { text: ["kein Text"] });
gleich("Vorlage ohne Text-Zeichenkette = Standard (leeres Objekt)", {}, (await vorbereiten("r2")).vorlage);
await einstellung("vorlagen.reaktivierung_bald", undefined); await einstellung("vorlagen.reaktivierung", undefined);

// ---------- 3. Zufall: Server = Büro/App (KR.reaktInfo mit denselben Einstellungen) ----------
let seed = 20261128;
const zufall = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; }; // obere Bits
const zaehler = [0, 0]; // [gesendet, abgelehnt]
for (let runde = 0; runde < 30; runde++) {
  const ein = zufall(3) ? { bald_tage: 1 + zufall(100), vorwarn_tage: 1 + zufall(120), monate: 1 + zufall(30) } : undefined;
  await einstellung("fristen.reaktivierung", ein);
  const regel = (await db.query("select public.reakt_regel($1::uuid) as r", [FS])).rows[0].r;
  const fr = { reaktivierung: ein || {} };
  const liste = [];
  for (let i = 0; i < 6; i++) liste.push({ id: "z" + i, reakt_status: ["bezahlt", "pruefen", "befreit"][zufall(3)], vertrag_am: zufall(5) ? tag(-zufall(900)) : null, reakt_bezahlt_bis: zufall(3) === 0 ? tag(zufall(300) - 100) : null });
  await schueler(liste);
  for (const s of liste) {
    const r = KR.reaktInfo(s, heute, regel, fr);
    const darf = ["gesperrt", "pruefen_faellig", "bald", "demnaechst"].includes(r.stufe);
    const d = await vorbereiten(s.id);
    gleich(`Zufall ${runde}/${s.id}: Server sendet ⇔ Büro bietet an (${r.stufe})`, darf, !d.fehler);
    zaehler[d.fehler ? 1 : 0]++;
    if (darf && !d.fehler) gleich(`Zufall ${runde}/${s.id}: Fälligkeit und Vorlage`, { f: r.faellig, v: r.tage >= 0 ? "reaktivierung_bald" : "reaktivierung" }, { f: d.faellig_am, v: d.vorlage_art });
  }
}
await einstellung("fristen.reaktivierung", undefined);
gleich(`Zufall: beide Ausgänge kommen vor (${zaehler[0]} gesendet, ${zaehler[1]} abgelehnt)`, true, zaehler[0] >= 5 && zaehler[1] >= 5);

// ---------- 4. Mail = Vorschau (dieselbe Datei, dieselben Werte) ----------
gleich("vorlagen.js ist Byte für Byte kompass-vorlagen.js", readFileSync(join(ROOT, "kompass-vorlagen.js"), "utf8"), readFileSync(join(ROOT, "supabase/functions/zahlungs-mail/vorlagen.js"), "utf8"));
await einstellung("vorlagen.reaktivierung_bald", { text: "Hallo,\n\nam {Datum} ({Tage} Tage) {Betrag} für {Vorname}, {Fahrschule}.\u0007 <b>fett</b>", text_eltern: "Eltern: {vorname}" });
await schueler([{ id: "m1", name: "Lena Muster", reakt_bezahlt_bis: tag(12) }]);
const d = await vorbereiten("m1");
for (const an of ["schueler", "eltern", "beide"]) {
  const dm = Object.assign({}, d, { an });
  const vorschau = KV.fuelle(KV.textFuer(KV.vorlageAus("reaktivierung_bald", d.vorlage), an, "Lena"), { Vorname: "Lena", Datum: d.faellig_am, Tage: d.tage, Betrag: d.betrag_cent, Fahrschule: MAIL.fahrschulName(d) });
  gleich("Mail-Satz = Vorschau (" + an + ")", vorschau, MAIL.satz(dm));
}
const text = MAIL.mailText(Object.assign({}, d, { an: "schueler" })), html = MAIL.mailHtml(Object.assign({}, d, { an: "schueler" }));
gleich("Mail: Platzhalter gefüllt, Steuerzeichen weg", true, text.includes("am " + KV.datumText(tag(12)) + " (12 Tage) 240,00 € für Lena, Fahrschule Muster.") && !text.includes("\u0007"));
gleich("Mail-HTML: Vorlage maskiert (kein <b> aus dem Büro-Text)", true, html.includes("&lt;b&gt;fett&lt;/b&gt;") && !html.includes("<b>fett</b>"));
gleich("Mail: Fällig am …", true, text.includes("Fällig am: " + KV.datumText(tag(12))) && html.includes("Fällig am: <b>" + KV.datumText(tag(12)) + "</b>"));
const b = MAIL.betreff(Object.assign({}, d, { an: "schueler" }));
gleich("Betreff fest, ohne Name und Betrag", "[TEST] Fahrschule Muster: Erinnerung zur Reaktivierung", b);
await einstellung("vorlagen.reaktivierung_bald", undefined);

// ---------- 5. Rechte und Limit bleiben ----------
await schueler([{ id: "l1", vertrag_am: monate(-13) }]);
await db.exec("delete from public.zahlungs_mails");
let letzte;
for (let i = 0; i < 6; i++) letzte = (await db.query("select public.zahlungs_mail_vorbereiten('l1', 'reaktivierung', 24000, 'Reaktivierung') as d")).rows[0].d;
gleich("Limit: 6. Mail am Tag abgelehnt", "zu_viele", letzte.fehler);
await alsNutzer(FREMD);
gleich("fremde Fahrschule: keine Berechtigung", "keine_berechtigung", (await vorbereiten("l1")).fehler);
await alsNutzer(BUERO);

// ---------- 6. Rückweg und wieder einspielen ----------
await schueler([{ id: "w1", reakt_bezahlt_bis: tag(300) }]);
gleich("vor dem Rückweg: zu früh", "reakt_nicht_faellig", (await vorbereiten("w1")).fehler);
await db.exec(RUECK);
gleich("Rückweg: Ergebnis-Abfrage", { funktion_w14: true, fuer_anon: false }, await erg(RUECK));
const w = await vorbereiten("w1");
gleich("Rückweg: wie W14 (keine Prüfung der Fälligkeit, keine Vorlage)", { ok: true, vorlage_art: undefined }, { ok: w.ok, vorlage_art: w.vorlage_art });
gleich("Rückweg: Mail mit W14-Daten = alter Satz", "deine Reaktivierung ist fällig. Bitte zahl:", MAIL.satz(Object.assign({}, w, { an: "schueler" })));
await db.exec(S4);
gleich("wieder eingespielt: zu früh", "reakt_nicht_faellig", (await vorbereiten("w1")).fehler);

console.log(fehler ? `Vorlagen-SQL-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Vorlagen-SQL-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
