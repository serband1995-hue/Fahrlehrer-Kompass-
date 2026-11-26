// W19 Teil 3: Punktesystem (Tabelle schueler_punkte, Funktionen) in echtem Postgres (PGlite), mit Rückweg.
// Prüft: Standard AUS (nichts buchbar), Vorzeichen setzt der Server, Wer/Wann vom Server, Kontostand-Prüfung beim Einlösen,
// Sperre gegen gleichzeitiges Einlösen, Verschenken nur mit Schalter und nur über die Funktion (zwei Zeilen, alles oder nichts),
// Fahrlehrer nur eigene Schüler und nur Einträge aus den Listen, Rolle auch im WITH CHECK (Lehre W18), fest (kein Ändern/Löschen),
// Rechte (Büro/Leitung/Super-Admin ja; Kollege, fremde Fahrschule, inaktiv, anon nein), Rückweg, zweimal einspielbar.
// Aufruf: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 && NODE_PATH=/tmp/w15-pg/node_modules node scripts/punkte-sql-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 und NODE_PATH=/tmp/w15-pg/node_modules");
  process.exit(1);
}
const R = join(fileURLToPath(new URL(".", import.meta.url)), "..", "supabase") + "/";
const sql = (n) => readFileSync(R + n, "utf8");
const db = new PGlite();
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
const BU = "aaaaaaaa-0000-4000-8000-000000000001", FL = "aaaaaaaa-0000-4000-8000-000000000002", SA = "aaaaaaaa-0000-4000-8000-000000000003",
  LA = "aaaaaaaa-0000-4000-8000-000000000004", BUB = "aaaaaaaa-0000-4000-8000-000000000005", INAKTIV = "aaaaaaaa-0000-4000-8000-000000000006",
  FL2 = "aaaaaaaa-0000-4000-8000-000000000007";
let bad = 0;
const ok = (n, e, i) => { const a = JSON.stringify(e), b = JSON.stringify(i); if (a !== b) { bad++; console.log("ABWEICHUNG", n, "erwartet", a, "ist", b); } else console.log("ok ", n); };
const q = async (s, p) => (await db.query(s, p)).rows;
const als = async (uid, fn) => { await db.exec(`set test.uid = '${uid}'; set role authenticated;`); try { return await fn(); } finally { await db.exec(`reset role; set test.uid = ''`); } };
const fehler = async (fn) => { try { await fn(); return "kein Fehler"; } catch (x) { return String(x.message); } };
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to public;
  create table public.fahrschulen (id uuid primary key, name text);
  create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true);
  create table public.schueler (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, name text);
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select 'Kristina'::text $$;
  create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
  create or replace function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
    select coalesce(exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true)) and (is_super_admin(auth.uid())
      or (fs is not null and fs = k5_meine_fahrschule() and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())))), false);
  $function$;
  grant usage on schema public to authenticated, anon;
  grant select on public.schueler, public.profiles, public.fahrschulen to authenticated;
  insert into public.fahrschulen values ('${A}','Fahrschule Muster'),('${B}','Fahrschule Fremd');
  insert into public.profiles values ('${BU}','${A}','buero',true),('${FL}','${A}','fahrlehrer',true),('${SA}',null,'super_admin',true),
    ('${LA}','${A}','fahrschule_admin',true),('${BUB}','${B}','buero',true),('${INAKTIV}','${A}','buero',false),('${FL2}','${A}','fahrlehrer',true);
  insert into public.schueler values ('s1','${A}','${FL}','Mia Muster'),('s2','${B}',null,'Max Fremd'),('s3','${A}','${FL2}','Nils Muster'),('s4','${A}','${FL}','Eva Muster');
`);
await db.exec(sql("migrations/20261125_einst_01_fahrschule_einstellungen.sql"));
await db.exec(sql("migrations/20261201_w19_02_zahlungsbelege.sql"));
let res = await db.exec(sql("migrations/20261202_w19_03_punkte.sql"));
ok("Prüf-Abfrage", { tabelle: 1, rls: true, policies: 2, trigger: 2, funktionen: 5 }, res[res.length - 1].rows[0]);
res = await db.exec(sql("migrations/20261202_w19_03_punkte.sql"));
ok("zweimal einspielbar", 2, res[res.length - 1].rows[0].trigger);

const buche = (fs, sid, art, punkte, grund) => q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values ('${fs}', '${sid}', '${art}', ${punkte}, '${grund}') returning *`);
const stand = async (uid, fs, sid) => (await als(uid, () => q(`select public.punkte_kontostand('${fs}', '${sid}') s`)))[0].s;
const einst = (uid, fs, k, w) => als(uid, () => q(`insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values ('${fs}','${k}','${JSON.stringify(w)}') on conflict (fahrschule_id, schluessel) do update set wert = excluded.wert`));

// ---------- Standard: AUS ----------
ok("Standard aus: Büro kann nichts buchen", true, /Punktesystem ist ausgeschaltet/.test(await fehler(() => als(BU, () => buche(A, "s1", "vergeben", 5, "Test")))));
ok("Standard aus: Fahrlehrer kann nichts buchen", true, /Punktesystem ist ausgeschaltet/.test(await fehler(() => als(FL, () => buche(A, "s1", "vergeben", 5, "Test")))));
await einst(BU, A, "punkte.system", { aktiv: true, verschenken: false, bedingungen: "" });
await einst(BU, A, "punkte.regeln", { liste: [{ id: "r1", name: "Pünktlich erschienen", punkte: 10 }, { id: "r2", name: "Theorie bestanden", punkte: 50 }] });
await einst(BU, A, "punkte.praemien", { liste: [{ id: "p1", name: "Gratis Fahrstunde", punkte: 100 }, { id: "p2", name: "Kleines Geschenk", punkte: 20 }] });
ok("Fahrlehrer darf Einstellungen nicht ändern (Schalter)", true, /Keine Berechtigung|row-level security/.test(await fehler(() => einst(FL, A, "punkte.system", { aktiv: false }))));

// ---------- Büro ----------
const b1 = (await als(BU, () => buche(A, "s1", "vergeben", 30, "  Test Büro  ")))[0];
ok("Büro: vergeben +30, Grund getrimmt, Server setzt wer/wann", { p: 30, grund: "Test Büro", von: BU, wer: "Kristina", zeit: true, gegen: null },
  { p: b1.punkte, grund: b1.grund, von: b1.erstellt_von, wer: b1.bearbeiter, zeit: !!b1.erstellt_am, gegen: b1.gegen_schueler_id });
const b2 = (await als(LA, () => buche(A, "s1", "vergeben", -80, "Leitung zählt positiv")))[0];
ok("Leitung: Vorzeichen setzt der Server (−80 → +80)", 80, b2.punkte);
ok("Kontostand 110", 110, await stand(BU, A, "s1"));
const e1 = (await als(BU, () => buche(A, "s1", "einloesen", 20, "Kleines Geschenk")))[0];
ok("Einlösen: Vorzeichen negativ (20 → −20), Kontostand 90", { p: -20, s: 90 }, { p: e1.punkte, s: await stand(BU, A, "s1") });
ok("Einlösen über den Kontostand abgelehnt", true, /Nicht genug Punkte: Kontostand 90, gebraucht 100/.test(await fehler(() => als(BU, () => buche(A, "s1", "einloesen", 100, "Gratis Fahrstunde")))));
ok("Kontostand nach Ablehnung unverändert", 90, await stand(BU, A, "s1"));
ok("Punkte 0 abgelehnt", true, /nicht 0|check/.test(await fehler(() => als(BU, () => buche(A, "s1", "vergeben", 0, "x")))));
ok("zu viele Punkte abgelehnt", true, /check|menge/.test(await fehler(() => als(BU, () => buche(A, "s1", "vergeben", 1000001, "x")))));
ok("Grund Pflicht", true, /Grund|check/.test(await fehler(() => als(BU, () => buche(A, "s1", "vergeben", 5, "   ")))));
ok("unbekannte Art abgelehnt", true, /check|row-level/.test(await fehler(() => als(BU, () => buche(A, "s1", "geschenkt", 5, "x")))));
ok("Schüler einer fremden Fahrschule abgelehnt", true, /gehört nicht/.test(await fehler(() => als(BU, () => buche(A, "s2", "vergeben", 5, "x")))));
// Hinweis: BEFORE-Auslöser laufen vor der Regel; für Fahrschule B kommt darum schon „ausgeschaltet“ – abgelehnt ist es in jedem Fall
ok("Büro A kann nicht für Fahrschule B buchen (WITH CHECK)", true, /Keine Berechtigung|row-level security|ausgeschaltet/.test(await fehler(() => als(BU, () => buche(B, "s2", "vergeben", 5, "x")))));
ok("gegen_schueler_id bei vergeben wird ignoriert", null, (await als(BU, () => q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id) values ('${A}','s1','vergeben',1,'x','s3') returning gegen_schueler_id`)))[0].gegen_schueler_id);

// ---------- Fahrlehrer (eigener Schüler) ----------
const f1 = (await als(FL, () => buche(A, "s4", "vergeben", 10, "Pünktlich erschienen")))[0];
ok("eigener Fahrlehrer: vergeben aus der Liste", { p: 10, von: FL }, { p: f1.punkte, von: f1.erstellt_von });
ok("Fahrlehrer: eigene Zahl (nicht aus der Liste) abgelehnt", true, /nicht in der Liste/.test(await fehler(() => als(FL, () => buche(A, "s4", "vergeben", 999, "Pünktlich erschienen")))));
ok("Fahrlehrer: eigener Grund abgelehnt", true, /nicht in der Liste/.test(await fehler(() => als(FL, () => buche(A, "s4", "vergeben", 10, "Erfunden")))));
ok("Fahrlehrer: einlösen aus der Prämien-Liste (Stand 10, Prämie 20 → zu wenig)", true, /Nicht genug Punkte/.test(await fehler(() => als(FL, () => buche(A, "s4", "einloesen", 20, "Kleines Geschenk")))));
await als(FL, () => buche(A, "s4", "vergeben", 50, "Theorie bestanden"));
const f2 = (await als(FL, () => buche(A, "s4", "einloesen", 20, "Kleines Geschenk")))[0];
ok("Fahrlehrer: einlösen klappt mit Stand 60", { p: -20, s: 40 }, { p: f2.punkte, s: await stand(FL, A, "s4") });
ok("Fahrlehrer: Regel-Name als Prämie abgelehnt (falsche Liste)", true, /nicht in der Liste/.test(await fehler(() => als(FL, () => buche(A, "s4", "einloesen", 10, "Pünktlich erschienen")))));
ok("Fahrlehrer: Schüler des Kollegen abgelehnt (WITH CHECK, Lehre W18)", true, /Keine Berechtigung|row-level security/.test(await fehler(() => als(FL, () => buche(A, "s3", "vergeben", 10, "Pünktlich erschienen")))));
ok("Fahrlehrer: Einlösen beim Schüler des Kollegen verrät keinen Kontostand (Richter)", true, await (async () => { const e = await fehler(() => als(FL, () => buche(A, "s3", "einloesen", 20, "Kleines Geschenk"))); return /Keine Berechtigung/.test(e) && !/Kontostand|genug/.test(e); })());
ok("Fahrlehrer: Schüler ohne Fahrlehrer / fremder Fahrschule abgelehnt", true, /Keine Berechtigung|row-level security|gehört nicht/.test(await fehler(() => als(FL, () => buche(A, "s2", "vergeben", 10, "Pünktlich erschienen")))));
ok("Fahrlehrer: sieht nur eigene Schüler (s1 + s4)", 2, (await als(FL, () => q(`select count(distinct schueler_id)::int n from public.schueler_punkte`)))[0].n);
ok("Fahrlehrer: sieht keine Buchungen von s3", 0, (await als(FL, () => q(`select count(*)::int n from public.schueler_punkte where schueler_id='s3'`)))[0].n);
ok("Kollege sieht nichts von s1/s4", 0, (await als(FL2, () => q(`select count(*)::int n from public.schueler_punkte`)))[0].n);
ok("Fahrlehrer: Kontostand fremder Schüler gesperrt", true, /Keine Berechtigung/.test(await fehler(() => stand(FL, A, "s3"))));
ok("Kollege: Kontostand von s1 gesperrt", true, /Keine Berechtigung/.test(await fehler(() => stand(FL2, A, "s1"))));
ok("Fahrlehrer wechselt Schüler: alter Fahrlehrer sieht nichts mehr", 0, await (async () => {
  await q(`update public.schueler set fahrlehrer_id='${FL2}' where id='s4'`);
  const n = (await als(FL, () => q(`select count(*)::int n from public.schueler_punkte where schueler_id='s4'`)))[0].n;
  await q(`update public.schueler set fahrlehrer_id='${FL}' where id='s4'`);
  return n;
})());

// ---------- Rechte ----------
ok("Büro A sieht nur eigene Fahrschule", true, (await als(BU, () => q(`select count(*)::int n from public.schueler_punkte`)))[0].n >= 6);
ok("Büro B sieht nichts von A", 0, (await als(BUB, () => q(`select count(*)::int n from public.schueler_punkte`)))[0].n);
ok("Büro B: Kontostand von A gesperrt", true, /Keine Berechtigung/.test(await fehler(() => stand(BUB, A, "s1"))));
ok("inaktives Büro sieht nichts", 0, (await als(INAKTIV, () => q(`select count(*)::int n from public.schueler_punkte`)))[0].n);
ok("inaktives Büro kann nicht buchen", true, /Keine Berechtigung|row-level security|nicht in der Liste/.test(await fehler(() => als(INAKTIV, () => buche(A, "s1", "vergeben", 1, "x")))));
const gesamt = (await q(`select count(*)::int n from public.schueler_punkte`))[0].n;
ok("Super-Admin sieht alle", gesamt, (await als(SA, () => q(`select count(*)::int n from public.schueler_punkte`)))[0].n);
ok("anon liest nicht", true, /permission denied/.test(await fehler(async () => { await db.exec(`set role anon`); try { await q(`select * from public.schueler_punkte`); } finally { await db.exec(`reset role`); } })));
ok("anon kann nicht verschenken", true, /permission denied/.test(await fehler(async () => { await db.exec(`set role anon`); try { await q(`select public.punkte_verschenken('${A}','s1','s4',1,'x')`); } finally { await db.exec(`reset role`); } })));
// fest
ok("Büro kann nicht ändern", true, /permission denied/.test(await fehler(() => als(BU, () => q(`update public.schueler_punkte set punkte = 1 where id='${b1.id}'`)))));
ok("Büro kann nicht löschen", true, /permission denied/.test(await fehler(() => als(BU, () => q(`delete from public.schueler_punkte where id='${b1.id}'`)))));
ok("auch Eigentümer (Dienst) kann nicht ändern", true, /nicht geändert oder gelöscht/.test(await fehler(() => q(`update public.schueler_punkte set punkte = 1 where id='${b1.id}'`))));
ok("auch Eigentümer (Dienst) kann nicht löschen", true, /nicht geändert oder gelöscht/.test(await fehler(() => q(`delete from public.schueler_punkte where id='${b1.id}'`))));

// ---------- Verschenken ----------
const gib = (uid, fs, von, an, p, g) => als(uid, () => q(`select public.punkte_verschenken('${fs}','${von}','${an}',${p},'${g}')`));
ok("Verschenken aus: Funktion lehnt ab", true, /Verschenken ist ausgeschaltet/.test(await fehler(() => gib(BU, A, "s1", "s3", 10, "Geschenk"))));
ok("Verschenken aus: direktes Einfügen von verschenkt_ab abgelehnt", true, /Keine Berechtigung|row-level security|ausgeschaltet/.test(await fehler(() => als(BU, () => q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id) values ('${A}','s1','verschenkt_ab',-5,'x','s3')`)))));
await einst(BU, A, "punkte.system", { aktiv: true, verschenken: true, bedingungen: "Nur zum Test" });
ok("Verschenken an: direktes Einfügen bleibt für Clients gesperrt", true, /Keine Berechtigung|row-level security/.test(await fehler(() => als(BU, () => q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund, gegen_schueler_id) values ('${A}','s3','verschenkt_an',5,'x','s1')`)))));
const vorS1 = await stand(BU, A, "s1"), vorS3 = await stand(BU, A, "s3");
await gib(BU, A, "s1", "s3", 40, "Geschenk");
ok("Verschenken: zwei Zeilen, Summe bleibt gleich", { s1: vorS1 - 40, s3: vorS3 + 40 }, { s1: await stand(BU, A, "s1"), s3: await stand(BU, A, "s3") });
const paar = await q(`select schueler_id, art, punkte, gegen_schueler_id g, bearbeiter from public.schueler_punkte where art like 'verschenkt%' order by art`);
ok("Verschenken: verschenkt_ab bei s1, verschenkt_an bei s3, gegenseitig verknüpft, wer gesetzt",
  [{ schueler_id: "s1", art: "verschenkt_ab", punkte: -40, g: "s3", bearbeiter: "Kristina" }, { schueler_id: "s3", art: "verschenkt_an", punkte: 40, g: "s1", bearbeiter: "Kristina" }], paar);
ok("Verschenken: zu viel (über Kontostand) → nichts gebucht", true, /Nicht genug Punkte/.test(await fehler(() => gib(BU, A, "s1", "s3", 5000, "Geschenk"))));
ok("… und der Empfänger hat nichts bekommen", vorS3 + 40, await stand(BU, A, "s3"));
ok("Verschenken an sich selbst abgelehnt", true, /zwei verschiedene/.test(await fehler(() => gib(BU, A, "s1", "s1", 5, "Geschenk"))));
ok("Verschenken an Schüler einer fremden Fahrschule abgelehnt (alles zurück)", true, await (async () => {
  const v = await stand(BU, A, "s1");
  const e = await fehler(() => gib(BU, A, "s1", "s2", 5, "Geschenk"));
  return /gehört nicht/.test(e) && v === (await stand(BU, A, "s1"));
})());
ok("Verschenken ohne Grund abgelehnt", true, /Grund/.test(await fehler(() => gib(BU, A, "s1", "s3", 5, "  "))));
ok("Verschenken 0 oder negativ abgelehnt", true, /größer als 0/.test(await fehler(() => gib(BU, A, "s1", "s3", -5, "x"))));
ok("Fahrlehrer verschenkt nicht, auch nicht vom eigenen Schüler (nur Büro/Leitung)", true, await (async () => { const e = await fehler(() => gib(FL, A, "s4", "s1", 10, "Geschenk")); return /Keine Berechtigung/.test(e) && (await stand(FL, A, "s4")) === 40; })());
await gib(BU, A, "s4", "s1", 10, "Geschenk"); // wie vorher: s4 hat danach 30 (Büro verschenkt)
ok("Fahrlehrer verschenkt NICHT vom Schüler des Kollegen", true, /Keine Berechtigung/.test(await fehler(() => gib(FL, A, "s3", "s1", 5, "Geschenk"))));
ok("Büro B verschenkt nicht in Fahrschule A", true, /Keine Berechtigung/.test(await fehler(() => gib(BUB, A, "s1", "s3", 5, "Geschenk"))));
// Schalter aus → alles wieder zu
await einst(BU, A, "punkte.system", { aktiv: false, verschenken: true, bedingungen: "" });
ok("System aus: Buchen gesperrt", true, /ausgeschaltet/.test(await fehler(() => als(BU, () => buche(A, "s1", "vergeben", 1, "x")))));
ok("System aus: Verschenken gesperrt", true, /ausgeschaltet/.test(await fehler(() => gib(BU, A, "s1", "s3", 1, "Geschenk"))));
ok("System aus: Lesen und Kontostand bleiben möglich", true, (await stand(BU, A, "s1")) > 0);
await einst(BU, A, "punkte.system", { aktiv: true, verschenken: false, bedingungen: "" });

// ---------- gleichzeitiges Einlösen (Sperre) ----------
// PGlite hat eine Verbindung; wir prüfen die Sperre inhaltlich: zwei Einlösungen nacheinander in EINER Transaktion dürfen den Stand nicht unterschreiten.
await als(BU, () => buche(A, "s3", "vergeben", 100, "Aufstocken"));
const s3 = await stand(BU, A, "s3");
const doppelt = await fehler(() => als(BU, async () => { await q("begin"); try { await q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values ('${A}','s3','einloesen',${s3},'Alles')`);
  await q(`insert into public.schueler_punkte (fahrschule_id, schueler_id, art, punkte, grund) values ('${A}','s3','einloesen',1,'Noch eins')`); await q("commit"); } catch (x) { await q("rollback"); throw x; } }));
ok("zwei Einlösungen in einer Transaktion: die zweite sieht die erste (Kontostand 0)", true, /Nicht genug Punkte: Kontostand 0/.test(doppelt));
ok("… und nichts davon gebucht", s3, await stand(BU, A, "s3"));
ok("Sperre im Auslöser (pg_advisory_xact_lock) vorhanden", true, /pg_advisory_xact_lock/.test((await q(`select prosrc from pg_proc where proname='schueler_punkte_anlegen'`))[0].prosrc));
ok("Spur: Einstellungen protokolliert", true, (await q(`select count(*)::int n from public.aenderungsprotokoll where feld like 'punkte.%'`))[0].n >= 4);

// ---------- Rückweg ----------
let e = await fehler(() => db.exec(sql("rueckweg/20261202_w19_03_rueckweg.sql")));
ok("Rückweg bricht ab, solange Buchungen da sind", true, /Erst sichern/.test(e));
ok("nach Abbruch alles noch da", true, (await q(`select count(*)::int n from public.schueler_punkte`))[0].n >= gesamt);
res = await db.exec(sql("rueckweg/20261202_w19_03_rueckweg.sql").replace("p_trotzdem boolean := false", "p_trotzdem boolean := true"));
ok("Rückweg mit p_trotzdem", { tabelle: 0, funktionen: 0 }, res[res.length - 1].rows[0]);
ok("Rückweg: Einstellungen punkte.* gelöscht", 0, (await q(`select count(*)::int n from public.fahrschule_einstellungen where schluessel like 'punkte.%'`))[0].n);
ok("Rückweg: Belege-Teil unberührt", 1, (await q(`select count(*)::int n from pg_tables where tablename='zahlungsbelege'`))[0].n);
res = await db.exec(sql("migrations/20261202_w19_03_punkte.sql"));
ok("nach Rückweg wieder einspielbar", 1, res[res.length - 1].rows[0].tabelle);

console.log(bad ? `\n${bad} Abweichung(en)` : "\nPunkte-SQL-Test: alles in Ordnung.");
process.exit(bad ? 1 : 0);
