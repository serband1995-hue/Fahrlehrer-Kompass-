// W15 Schritt 5: erinnerungs_mail_vorbereiten (Erinnerungen ohne Zahlung) in echtem Postgres (PGlite, ohne Netz, erfundene Daten).
// Spielt K8, K9, zm_01, W14, W11, W15 S1–S5 gegen eine kleine Attrappe ein und prüft:
// - Frist und Warnzeit rechnet der Server genau wie Büro und App (kompass-rechnen.js, mit denselben Einstellungen; Zufallsvergleich).
// - Länder-Regel der Umschreiber (land_key, fs_drittstaat) = KR.landKey / istEuEwr / istDrittstaat für alle Listen-Einträge.
// - Gemeinsames Limit mit den Zahlungs-Mails, Empfänger nur vom Server (Test: nur Test-Adresse), Rechte, Vorlage.
// - Mail-Satz = Vorschau (dieselbe Datei kompass-vorlagen.js), Rückweg und erneutes Einspielen.
// Aufruf: NODE_PATH=$(npm root -g) node scripts/erinnerung-sql-test.mjs   (braucht npm i -g @electric-sql/pglite@0.2.17)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
const KR = require(join(ROOT, "kompass-rechnen.js"));
const KV = require(join(ROOT, "kompass-vorlagen.js"));
const MAIL = await import(pathToFileURL(join(ROOT, "supabase/functions/erinnerungs-mail/mail.js")).href);
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
    status text default 'aktiv', reakt_status text default 'pruefen', reakt_bezahlt_bis date, vertrag_am date, inaktiv_seit date,
    theorie_abgeschlossen_am date, theorie_bestanden_am date, antrag_am date, theorie_frist_bis date, wohnsitz_de_seit date, auslands_fs jsonb, ausbildungsart text);
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
  "20261125_einst_01_fahrschule_einstellungen", "20261126_w15_01_reakt_entfaellt", "20261127_w15_02_fristen_einstellungen", "20261128_w15_03_vorlagen_mail"]) await db.exec(sql("migrations/" + m + ".sql"));
await db.exec("alter table public.fahrschule_preise disable trigger fahrschule_preise_schutz");
const S5 = sql("migrations/20261129_w15_04_erinnerungs_mail.sql"), RUECK = sql("rueckweg/20261129_w15_04_rueckweg.sql");
const erg = (q) => db.query(q.slice(q.lastIndexOf("\nselect ") + 1)).then((r) => r.rows[0]);
await db.exec(S5);
gleich("Ergebnis-Abfrage", { tabelle: 1, rls: true, funktion_neu: true, limit_gemeinsam: true, fuer_anon: false, schreiben_direkt: false },
  Object.assign(await erg(S5), { tabelle: Number((await erg(S5)).tabelle) }));
await db.exec(S5); // zweimal einspielbar

const heute = (await db.query("select (now() at time zone 'Europe/Berlin')::date::text as d")).rows[0].d;
const tag = (n) => KR.addDaysISO(heute, n), monate = (n) => KR.addMonthsISO(heute, n);
async function alsNutzer(uid) { await db.query("select set_config('test.uid', $1, false)", [uid || ""]); }
await alsNutzer(BUERO);
await db.query("insert into public.fahrschule_zahlungsdaten (fahrschule_id, kontoinhaber, iban, modus, test_email, impressum) values ($1, 'Fahrschule Muster', 'DE89370400440532013000', 'test', 'test@example.org', 'Fahrschule Muster, Beispielstraße 1')", [FS]);
const SP = ["theorie_abgeschlossen_am", "theorie_bestanden_am", "antrag_am", "theorie_frist_bis", "wohnsitz_de_seit", "auslands_fs", "ausbildungsart", "inaktiv_seit", "email", "ausbildung"];
async function schueler(liste) {
  await db.exec("delete from public.zahlungs_mails; delete from public.erinnerungs_mails; delete from public.schueler_eltern; delete from public.schueler;");
  for (const s of liste) {
    await db.query(`insert into public.schueler (id, fahrschule_id, name, ${SP.join(", ")}) values ($1, $2, $3, ${SP.map((_, i) => "$" + (i + 4)).join(", ")})`,
      [s.id, s.fahrschule_id || FS, s.name || "Lena Muster", ...SP.map((k) => (k === "auslands_fs" || k === "ausbildung" ? (s[k] === undefined ? null : JSON.stringify(s[k])) : k === "email" ? (s.email === undefined ? "lena@example.org" : s.email) : s[k] ?? null))]);
  }
}
async function einstellung(schluessel, wert) {
  await db.query("delete from public.fahrschule_einstellungen where fahrschule_id = $1 and schluessel = $2", [FS, schluessel]);
  if (wert !== undefined) await db.query("insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values ($1, $2, $3::jsonb)", [FS, schluessel, JSON.stringify(wert)]);
}
async function vorbereiten(sid, art) {
  await db.exec("delete from public.erinnerungs_mails; delete from public.zahlungs_mails;");
  return (await db.query("select public.erinnerungs_mail_vorbereiten($1, $2) as d", [sid, art])).rows[0].d;
}
const kurz = (d) => (d.fehler ? { fehler: d.fehler } : { vorlage_art: d.vorlage_art, frist_am: d.frist_am, tage: d.tage });
const TR = { land: "Türkei" };

// ---------- 1. Feste Fälle ----------
const FAELLE = [
  ["Theorie: Unterricht, in 20 Tagen", { theorie_abgeschlossen_am: KR.addMonthsISO(tag(20), -12) }, "theorie", { vorlage_art: "erinnerung_theorie", frist_am: tag(20), tage: 20 }],
  ["Theorie: in 60 Tagen (Vorwarnung)", { theorie_abgeschlossen_am: KR.addMonthsISO(tag(60), -12) }, "theorie", { vorlage_art: "erinnerung_theorie", frist_am: tag(60), tage: 60 }],
  ["Theorie: in 61 Tagen noch nicht", { theorie_abgeschlossen_am: KR.addMonthsISO(tag(61), -12) }, "theorie", { fehler: "nicht_faellig" }],
  ["Theorie: abgelaufen", { theorie_abgeschlossen_am: KR.addMonthsISO(tag(-1), -12) }, "theorie", { fehler: "abgelaufen" }],
  ["Theorie: heute letzter Tag", { theorie_abgeschlossen_am: KR.addMonthsISO(heute, -12) }, "theorie", { vorlage_art: "erinnerung_theorie", frist_am: heute, tage: 0 }],
  ["Praxis nach Theorie (§ 18 FeV)", { theorie_bestanden_am: KR.addMonthsISO(tag(10), -12), theorie_abgeschlossen_am: tag(-500) }, "theorie", { vorlage_art: "erinnerung_praxis", frist_am: tag(10), tage: 10 }],
  ["Theorie ohne Datum", {}, "theorie", { fehler: "ohne_datum" }],
  ["Antrag in 60 Tagen", { antrag_am: KR.addMonthsISO(tag(60), -12) }, "antrag", { vorlage_art: "erinnerung_antrag", frist_am: tag(60), tage: 60 }],
  ["Antrag in 61 Tagen noch nicht", { antrag_am: KR.addMonthsISO(tag(61), -12) }, "antrag", { fehler: "nicht_faellig" }],
  ["Antrag: nach Theorie länger (12 Monate fest)", { antrag_am: KR.addMonthsISO(tag(5), -12), theorie_bestanden_am: KR.addMonthsISO(tag(40), -12) }, "antrag", { vorlage_art: "erinnerung_antrag", frist_am: tag(40), tage: 40 }],
  ["Behörde in 30 Tagen", { theorie_frist_bis: tag(30) }, "behoerde", { vorlage_art: "erinnerung_behoerde", frist_am: tag(30), tage: 30 }],
  ["Behörde: Theorie bestanden = erledigt", { theorie_frist_bis: tag(30), theorie_bestanden_am: tag(-3) }, "behoerde", { fehler: "erledigt" }],
  ["Behörde in 70 Tagen noch nicht", { theorie_frist_bis: tag(70) }, "behoerde", { fehler: "nicht_faellig" }],
  ["Umschreiber Türkei, in 25 Tagen", { ausbildungsart: "umschreibung", auslands_fs: [TR], wohnsitz_de_seit: KR.addMonthsISO(tag(25), -6) }, "umschreiber", { vorlage_art: "erinnerung_umschreiber", frist_am: tag(25), tage: 25 }],
  ["Umschreiber in 31 Tagen noch nicht", { ausbildungsart: "umschreibung", auslands_fs: [TR], wohnsitz_de_seit: KR.addMonthsISO(tag(31), -6) }, "umschreiber", { fehler: "nicht_faellig" }],
  ["Umschreiber über ausbildung.umschreiber", { ausbildung: { umschreiber: true }, auslands_fs: [TR], wohnsitz_de_seit: KR.addMonthsISO(tag(5), -6) }, "umschreiber", { vorlage_art: "erinnerung_umschreiber", frist_am: tag(5), tage: 5 }],
  ["Umschreiber EU (Polen + Türkei): keine Frist", { ausbildungsart: "umschreibung", auslands_fs: [TR, { land: "polen" }], wohnsitz_de_seit: tag(-170) }, "umschreiber", { fehler: "keine_frist" }],
  ["Umschreiber Land unbekannt", { ausbildungsart: "umschreibung", auslands_fs: [{ land: "Atlantis" }], wohnsitz_de_seit: tag(-170) }, "umschreiber", { fehler: "keine_frist" }],
  ["kein Umschreiber", { ausbildungsart: "ersterwerb", auslands_fs: [TR], wohnsitz_de_seit: tag(-170) }, "umschreiber", { fehler: "keine_frist" }],
  ["Umschreiber ohne Wohnsitz-Datum", { ausbildungsart: "umschreibung", auslands_fs: [TR] }, "umschreiber", { fehler: "ohne_datum" }],
  ["Archiv: keine Erinnerung", { theorie_frist_bis: tag(10), inaktiv_seit: tag(-1) }, "behoerde", { fehler: "nicht_aktiv" }],
  ["unbekannte Art", { theorie_frist_bis: tag(10) }, "reaktivierung", { fehler: "art_unbekannt" }],
];
for (const [name, s, art, erwartet] of FAELLE) {
  await schueler([Object.assign({ id: "f1" }, s)]);
  gleich(name, erwartet, kurz(await vorbereiten("f1", art)));
}
// Einstellungen wirken (Dauer, Warnzeiten; Vorwarnung nie kürzer als Warnung)
await schueler([{ id: "e1", theorie_abgeschlossen_am: KR.addMonthsISO(tag(20), -6) }, { id: "e2", antrag_am: KR.addMonthsISO(tag(80), -18) }, { id: "e3", theorie_frist_bis: tag(50) }]);
await einstellung("fristen.theorie", { monate: 6 });
await einstellung("fristen.antrag", { monate: 18, bald_tage: 90 });
await einstellung("fristen.behoerde", { bald_tage: 50, vorwarn_tage: 5 });
gleich("Einstellung Theorie 6 Monate", { vorlage_art: "erinnerung_theorie", frist_am: tag(20), tage: 20 }, kurz(await vorbereiten("e1", "theorie")));
gleich("Einstellung Antrag 18 Monate, Warnung 90", { vorlage_art: "erinnerung_antrag", frist_am: tag(80), tage: 80 }, kurz(await vorbereiten("e2", "antrag")));
gleich("Behörde: Vorwarnung kürzer als Warnung → Warnung 50", { vorlage_art: "erinnerung_behoerde", frist_am: tag(50), tage: 50 }, kurz(await vorbereiten("e3", "behoerde")));
for (const k of ["fristen.theorie", "fristen.antrag", "fristen.behoerde"]) await einstellung(k, undefined);

// ---------- 2. Zufall: Server = Büro/App ----------
let seed = 20261129;
const zufall = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; }; // obere Bits: die unteren wiederholen sich (bei % 2 immer abwechselnd)
const zaehler = { theorie: [0, 0], antrag: [0, 0], behoerde: [0, 0], umschreiber: [0, 0] }; // [gesendet, abgelehnt]
const LAENDER = [TR, { land: "Polen" }, { land: "Syrien" }, { land: "Atlantis" }, { land: "Ukraine" }];
for (let runde = 0; runde < 25; runde++) {
  const ein = {};
  if (zufall(2)) ein.theorie = { monate: 1 + zufall(24), bald_tage: 1 + zufall(90), vorwarn_tage: 1 + zufall(120) };
  if (zufall(2)) ein.antrag = { monate: 1 + zufall(24), bald_tage: 1 + zufall(120) };
  if (zufall(2)) ein.behoerde = { bald_tage: 1 + zufall(90), vorwarn_tage: 1 + zufall(120) };
  if (zufall(2)) ein.umschreiber = { bald_tage: 1 + zufall(200) };
  for (const k of ["theorie", "antrag", "behoerde", "umschreiber"]) await einstellung("fristen." + k, ein[k]);
  const liste = [];
  for (let i = 0; i < 6; i++) liste.push({ id: "z" + i,
    theorie_abgeschlossen_am: zufall(3) ? tag(-zufall(800)) : null, theorie_bestanden_am: zufall(3) === 0 ? tag(-zufall(500)) : null,
    antrag_am: zufall(2) ? tag(-zufall(800)) : null, theorie_frist_bis: zufall(2) ? tag(zufall(200) - 40) : null,
    ausbildungsart: zufall(2) ? "umschreibung" : "ersterwerb", auslands_fs: zufall(4) ? [LAENDER[zufall(5)]] : [], wohnsitz_de_seit: zufall(4) ? tag(-zufall(300)) : null });
  await schueler(liste);
  for (const s of liste) {
    const t = KR.theorieInfo(s, heute, ein), a = KR.antragInfo(s, heute, ein), tf = KR.theorieFristInfo(s, heute, ein), u = KR.umschreibInfo(s, heute, ein);
    const buero = { theorie: ["bald", "demnaechst"].includes(t.stufe), antrag: a.stufe === "bald", behoerde: ["bald", "demnaechst"].includes(tf.stufe), umschreiber: u.stufe === "bald" };
    const datum = { theorie: t.ablauf, antrag: a.ablauf, behoerde: tf.ablauf, umschreiber: u.bis };
    for (const art of ["theorie", "antrag", "behoerde", "umschreiber"]) {
      const d = await vorbereiten(s.id, art);
      gleich(`Zufall ${runde}/${s.id}/${art}: Server sendet ⇔ Büro zeigt in „Läuft bald ab“`, buero[art], !d.fehler);
      zaehler[art][d.fehler ? 1 : 0]++;
      if (!d.fehler) gleich(`Zufall ${runde}/${s.id}/${art}: gleiches Datum`, datum[art], d.frist_am);
      if (!d.fehler && art === "theorie") gleich(`Zufall ${runde}/${s.id}: Vorlage Praxis ⇔ Theorie bestanden`, t.grund === "praxis" ? "erinnerung_praxis" : "erinnerung_theorie", d.vorlage_art);
    }
  }
}
for (const k of ["theorie", "antrag", "behoerde", "umschreiber"]) await einstellung("fristen." + k, undefined);
for (const [art, [ja, nein]] of Object.entries(zaehler)) gleich(`Zufall ${art}: beide Ausgänge kommen vor (${ja} gesendet, ${nein} abgelehnt)`, true, ja >= 3 && nein >= 3);

// ---------- 3. Länder: Server = KR ----------
const namen = [...KR.EU_EWR, ...KR.DRITTSTAATEN, ...Object.keys(KR.LAND_NAMEN), ...Object.values(KR.LAND_NAMEN), "Atlantis", "", "  ", "TÜRKEI", " türkei ", "Tuerkei", "Österreich", "oesterreich", "Vereinigtes  Königreich", "England", "USA", "Bosnien", "dänemark", "Grossbritannien", "Großbritannien"];
for (const n of namen) {
  const varianten = [n, n.toUpperCase(), "  " + n.toLowerCase() + " "];
  for (const v of varianten) {
    const k = (await db.query("select public.land_key($1) as k", [v])).rows[0].k;
    gleich(`land_key „${v}“`, KR.landKey(v), k);
    const f = (await db.query("select public.fs_drittstaat($1::jsonb) as f", [JSON.stringify([{ land: v }])])).rows[0].f;
    const js = !String(v) ? "kein" : KR.istEuEwr(v) ? "eu" : KR.istDrittstaat(v) ? "drittstaat" : "land_pruefen";
    gleich(`fs_drittstaat „${v}“`, js, f);
  }
}
gleich("fs_drittstaat: leer / kein Feld / Unsinn", ["kein", "kein", "kein"], [
  (await db.query("select public.fs_drittstaat('[]'::jsonb) as f")).rows[0].f, (await db.query("select public.fs_drittstaat(null) as f")).rows[0].f,
  (await db.query(`select public.fs_drittstaat('[{"land": 5}, "x", null]'::jsonb) as f`)).rows[0].f]);

// ---------- 4. Empfänger, Limit, Rechte, Vorlage ----------
await schueler([{ id: "m1", theorie_frist_bis: tag(10) }]);
let d = await vorbereiten("m1", "behoerde");
gleich("Test: nur die Test-Adresse", { empfaenger: "test@example.org", alle: ["test@example.org"], modus: "test" }, { empfaenger: d.empfaenger, alle: d.empfaenger_alle, modus: d.modus });
gleich("Spur-Eintrag mit Art, Vorlage, Frist, gekürzter Adresse", { art: "behoerde", vorlage: "erinnerung_behoerde", frist_am: tag(10), modus: "test", empfaenger_kurz: "t***@example.org", status: "vorbereitet" },
  (await db.query("select art, vorlage, frist_am::text, modus, empfaenger_kurz, status from public.erinnerungs_mails")).rows[0]);
await db.query("update public.fahrschule_zahlungsdaten set modus = 'echt' where fahrschule_id = $1", [FS]);
await db.query("insert into public.schueler_eltern (schueler_id, email, mail_an) values ('m1', 'eltern@example.org', 'beide')");
d = await vorbereiten("m1", "behoerde");
gleich("Echt: Schüler und Eltern (W14-Regel)", { alle: ["lena@example.org", "eltern@example.org"], an: "beide", modus: "echt" }, { alle: d.empfaenger_alle, an: d.an, modus: d.modus });
await schueler([{ id: "m2", theorie_frist_bis: tag(10), email: null }]);
gleich("Echt ohne Adresse: keine_email", "keine_email", (await vorbereiten("m2", "behoerde")).fehler);
await db.query("update public.fahrschule_zahlungsdaten set modus = 'test' where fahrschule_id = $1", [FS]);
// Gemeinsames Limit: 3 Zahlungs-Mails + 2 Erinnerungen = 5 → die 6. (egal welche) abgelehnt
await schueler([{ id: "l1", theorie_frist_bis: tag(10) }]);
await db.query("update public.schueler set reakt_status = 'bezahlt', vertrag_am = $1 where id = 'l1'", [monate(-13)]);
await db.exec("delete from public.erinnerungs_mails; delete from public.zahlungs_mails;");
const zm = () => db.query("select public.zahlungs_mail_vorbereiten('l1', 'reaktivierung', 24000, 'Reaktivierung') as d").then((r) => r.rows[0].d);
const em = () => db.query("select public.erinnerungs_mail_vorbereiten('l1', 'behoerde') as d").then((r) => r.rows[0].d);
const ergebnisse = [await zm(), await zm(), await zm(), await em(), await em(), await em(), await zm()].map((x) => x.fehler || "ok");
gleich("gemeinsames Limit (5 je Schüler und Tag)", ["ok", "ok", "ok", "ok", "ok", "zu_viele", "zu_viele"], ergebnisse);
await db.exec("update public.erinnerungs_mails set status = 'fehler'");
gleich("fehlgeschlagene zählen nicht", "ok", (await em()).fehler || "ok");
// Rechte
await alsNutzer(FREMD);
gleich("fremde Fahrschule: keine Berechtigung", "keine_berechtigung", (await vorbereiten("l1", "behoerde")).fehler);
await alsNutzer("");
gleich("nicht angemeldet", "nicht_angemeldet", (await vorbereiten("l1", "behoerde")).fehler);
await alsNutzer(BUERO);
await db.exec("grant usage on schema public, auth to authenticated; grant execute on function auth.uid() to authenticated;");
await db.exec("set role authenticated");
const versuch = async (q, p) => { try { await db.query(q, p); return "ok"; } catch (e) { return String(e.message); } };
gleich("Rolle: Erinnerung vorbereiten geht", "ok", await versuch("select public.erinnerungs_mail_vorbereiten('l1', 'behoerde')"));
gleich("Rolle: Spur nicht direkt beschreibbar", true, /permission denied/.test(await versuch(`insert into public.erinnerungs_mails (fahrschule_id, schueler_id, art, modus) values ('${FS}', 'l1', 'behoerde', 'echt')`)));
gleich("Rolle: Limit-Funktion nicht direkt", true, /permission denied/.test(await versuch(`select public.mail_limit('${FS}', 'l1', 'test')`)));
gleich("Rolle: Spur lesbar (Büro)", "ok", await versuch("select * from public.erinnerungs_mails"));
await db.exec("reset role");
gleich("anon darf nicht", false, (await db.query("select has_function_privilege('anon', 'public.erinnerungs_mail_vorbereiten(text,text)', 'execute') as x")).rows[0].x);
// Vorlage und Mail = Vorschau
await einstellung("vorlagen.erinnerung_behoerde", { text: "Bis {Datum} ({Tage} Tage), {Vorname}! <i>x</i>", text_eltern: 7 });
await schueler([{ id: "v1", name: "Lena Muster", theorie_frist_bis: tag(12) }]);
d = await vorbereiten("v1", "behoerde");
gleich("Vorlage: nur Texte", { text: "Bis {Datum} ({Tage} Tage), {Vorname}! <i>x</i>" }, d.vorlage);
for (const an of ["schueler", "eltern", "beide"]) {
  const vorschau = KV.fuelle(KV.textFuer(KV.vorlageAus("erinnerung_behoerde", d.vorlage), an, "Lena"), { Vorname: "Lena", Datum: d.frist_am, Tage: d.tage, Fahrschule: MAIL.fahrschulName(d) });
  gleich("Mail-Satz = Vorschau (" + an + ")", vorschau, MAIL.satz(Object.assign({}, d, { an })));
}
const html = MAIL.mailHtml(Object.assign({}, d, { an: "schueler" }));
gleich("Mail-HTML maskiert, Frist im Kasten", true, html.includes("&lt;i&gt;x&lt;/i&gt;") && html.includes(KV.datumText(tag(12))));
gleich("Betreff fest, ohne Name", "[TEST] Fahrschule Muster: Erinnerung zur Frist der Führerscheinstelle", MAIL.betreff(Object.assign({}, d, { an: "schueler" })));
gleich("vorlagen.js der Erinnerung = kompass-vorlagen.js", readFileSync(join(ROOT, "kompass-vorlagen.js"), "utf8"), readFileSync(join(ROOT, "supabase/functions/erinnerungs-mail/vorlagen.js"), "utf8"));
let wirft = false; try { MAIL.betreff({ vorlage_art: "pruefung" }); } catch (e) { wirft = true; }
gleich("Mail: fremde Vorlage-Art wird abgelehnt", true, wirft);

// ---------- 5. Rückweg und wieder einspielen ----------
await db.exec(RUECK);
gleich("Rückweg: Ergebnis-Abfrage", { funktion_weg: true, zahlung_wie_s4: true, spur_bleibt: 1 }, Object.assign(await erg(RUECK), { spur_bleibt: Number((await erg(RUECK)).spur_bleibt) }));
gleich("Rückweg: Zahlungs-Mail geht weiter", "ok", (await db.query("select public.zahlungs_mail_vorbereiten('v1', 'pruefung', 12000, 'Prüfung') as d")).rows[0].d.ok ? "ok" : "nein");
await db.exec(S5);
gleich("wieder eingespielt", { vorlage_art: "erinnerung_behoerde", frist_am: tag(12), tage: 12 }, kurz(await vorbereiten("v1", "behoerde")));

console.log(fehler ? `Erinnerung-SQL-Test: ${fehler} von ${faelle} Fällen weichen ab.` : `Erinnerung-SQL-Test: alle ${faelle} Fälle gleich.`);
process.exit(fehler ? 1 : 0);
