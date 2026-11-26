// W19 Teil 2: Zahlungsbelege in echtem Postgres (PGlite), mit Rückweg.
// Prüft: Nummer fortlaufend je Fahrschule, Server setzt Name/Kopf/Steuer, Bargeld nur mit Schalter, fest (kein Ändern/Löschen),
// Storno nur als Gegenbeleg (einmal, nie ein Storno), Rechte (Büro/Leitung/Super-Admin ja; Fahrlehrer, fremde Fahrschule, anon nein),
// Rolle im WITH CHECK (Lehre W18), Einstellungs-Schlüssel beleg.* / punkte.*.
// Aufruf: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 && NODE_PATH=/tmp/w15-pg/node_modules node scripts/belege-sql-test.mjs
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
  LA = "aaaaaaaa-0000-4000-8000-000000000004", BUB = "aaaaaaaa-0000-4000-8000-000000000005", INAKTIV = "aaaaaaaa-0000-4000-8000-000000000006";
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
  create table public.schueler (id text primary key, fahrschule_id uuid, name text);
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select 'Kristina'::text $$;
  create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
  -- zm_darf wörtlich wie 20261124_zm_01
  create or replace function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
    select coalesce(exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true)) and (is_super_admin(auth.uid())
      or (fs is not null and fs = k5_meine_fahrschule() and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())))), false);
  $function$;
  grant usage on schema public to authenticated, anon;
  grant select on public.schueler, public.profiles, public.fahrschulen to authenticated;
  insert into public.fahrschulen values ('${A}','Fahrschule Muster'),('${B}','Fahrschule Fremd');
  insert into public.profiles values ('${BU}','${A}','buero',true),('${FL}','${A}','fahrlehrer',true),('${SA}',null,'super_admin',true),
    ('${LA}','${A}','fahrschule_admin',true),('${BUB}','${B}','buero',true),('${INAKTIV}','${A}','buero',false);
  insert into public.schueler values ('s1','${A}','Mia Muster'),('s2','${B}','Max Fremd');
`);
await db.exec(sql("migrations/20261125_einst_01_fahrschule_einstellungen.sql"));
let res = await db.exec(sql("migrations/20261201_w19_02_zahlungsbelege.sql"));
ok("Prüf-Abfrage", { tabellen: 2, rls_belege: true, rls_zaehler: true, policies: 2, trigger: 2, konstante_ok: true }, res[res.length - 1].rows[0]);
res = await db.exec(sql("migrations/20261201_w19_02_zahlungsbelege.sql"));
ok("zweimal einspielbar", 2, res[res.length - 1].rows[0].trigger);

const neu = (fs, sid, betrag, zahlart, extra = "") => q(`insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart${extra ? ", " + extra.split("=")[0] : ""})
  values ('${fs}', ${sid ? `'${sid}'` : "null"}, 'Falscher Name', current_date, ${betrag}, '  Grundbetrag  ', '${zahlart}'${extra ? ", " + extra.split("=")[1] : ""}) returning *`);

// Einstellungen als Büro
await als(BU, () => q(`insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values
  ('${A}','beleg.fahrschule','{"name":"","anschrift":"Musterstraße 1, 12345 Musterstadt","steuernummer":"12/345/67890","ustid":""}'),
  ('${A}','punkte.regeln','{"aktiv":false}')`));
ok("Schlüssel beleg.* und punkte.* erlaubt", 2, (await q(`select count(*)::int n from public.fahrschule_einstellungen`))[0].n);
ok("falscher Schlüssel abgelehnt", true, /fe_schluessel/.test(await fehler(() => als(BU, () => q(`insert into public.fahrschule_einstellungen values ('${A}','kasse.x','{}')`)))));

// Anlegen EC/Überweisung als Büro
const b1 = (await als(BU, () => neu(A, "s1", 120.5, "ec")))[0];
ok("Nr. 1, Name vom Server, Zweck getrimmt, Kopf mit Name der Fahrschule", { n: 1, name: "Mia Muster", zweck: "Grundbetrag", kopf: "Fahrschule Muster", stnr: "12/345/67890", von: BU, wer: "Kristina", steuer: null },
  { n: b1.nummer, name: b1.schueler_name, zweck: b1.zweck, kopf: b1.fahrschule_daten.name, stnr: b1.fahrschule_daten.steuernummer, von: b1.erstellt_von, wer: b1.bearbeiter, steuer: b1.steuer });
const b2 = (await als(LA, () => neu(A, "s1", 45, "ueberweisung")))[0];
ok("Leitung legt an, Nr. 2", 2, b2.nummer);
const bB = (await als(BUB, () => neu(B, "s2", 10, "ec")))[0];
ok("andere Fahrschule beginnt bei Nr. 1", 1, bB.nummer);
// Bargeld
ok("Bargeld ohne Schalter abgelehnt", true, /Bargeld-Belege sind in den Einstellungen ausgeschaltet/.test(await fehler(() => als(BU, () => neu(A, "s1", 20, "bar")))));
ok("Nummer nach Ablehnung nicht verbraucht (lückenlos)", 3, (await als(BU, () => neu(A, "s1", 1, "ec")))[0].nummer);
await als(BU, () => q(`insert into public.fahrschule_einstellungen values ('${A}','beleg.bargeld','{"aktiv":true}')`));
await als(BU, () => q(`insert into public.fahrschule_einstellungen values ('${A}','beleg.steuer','{"ausweisen":true,"satz":19,"hinweis":"Test"}')`));
const bBar = (await als(BU, () => neu(A, "s1", 30, "bar")))[0];
ok("Bargeld mit Schalter, Nr. 4, Steuer-Kopie", { n: 4, satz: 19 }, { n: bBar.nummer, satz: bBar.steuer && bBar.steuer.satz });
// Kopie bleibt bei späterer Änderung der Einstellung
await als(BU, () => q(`update public.fahrschule_einstellungen set wert='{"name":"Neu","anschrift":"Anders"}' where fahrschule_id='${A}' and schluessel='beleg.fahrschule'`));
ok("alter Beleg behält alten Kopf", "Musterstraße 1, 12345 Musterstadt", (await q(`select fahrschule_daten->>'anschrift' a from public.zahlungsbelege where id='${b1.id}'`))[0].a);
// Prüfungen beim Anlegen
ok("Betrag 0 abgelehnt", true, /Betrag/.test(await fehler(() => als(BU, () => neu(A, "s1", 0, "ec")))));
ok("Betrag negativ ohne Storno abgelehnt", true, /Betrag/.test(await fehler(() => als(BU, () => neu(A, "s1", -5, "ec")))));
ok("Schüler einer fremden Fahrschule abgelehnt", true, /gehört nicht/.test(await fehler(() => als(BU, () => neu(A, "s2", 5, "ec")))));
ok("unbekannte Zahlart abgelehnt", true, /check/.test(await fehler(() => als(BU, () => neu(A, "s1", 5, "scheck")))));
ok("Nummer selbst setzen wirkt nicht", 5, (await als(BU, () => neu(A, "s1", 2, "ec", "nummer=999")))[0].nummer);
// Rechte
ok("Fahrlehrer darf nicht anlegen", true, /row-level security/.test(await fehler(() => als(FL, () => neu(A, "s1", 5, "ec")))));
ok("Fahrlehrer sieht keine Belege", 0, (await als(FL, () => q(`select count(*)::int n from public.zahlungsbelege`)))[0].n);
ok("Büro A darf nicht für Fahrschule B anlegen (WITH CHECK)", true, /row-level security/.test(await fehler(() => als(BU, () => neu(B, null, 5, "ec")))));
ok("Büro A sieht nur eigene", 5, (await als(BU, () => q(`select count(*)::int n from public.zahlungsbelege`)))[0].n);
ok("Büro B sieht nur eigene", 1, (await als(BUB, () => q(`select count(*)::int n from public.zahlungsbelege`)))[0].n);
ok("inaktives Büro sieht nichts", 0, (await als(INAKTIV, () => q(`select count(*)::int n from public.zahlungsbelege`)))[0].n);
ok("Super-Admin sieht alle", 6, (await als(SA, () => q(`select count(*)::int n from public.zahlungsbelege`)))[0].n);
ok("Zähler für Clients gesperrt", true, /permission denied/.test(await fehler(() => als(BU, () => q(`select * from public.beleg_zaehler`)))));
ok("anon liest nicht", true, /permission denied/.test(await fehler(async () => { await db.exec(`set role anon`); try { await q(`select * from public.zahlungsbelege`); } finally { await db.exec(`reset role`); } })));
// fest
ok("Büro kann nicht ändern", true, /permission denied/.test(await fehler(() => als(BU, () => q(`update public.zahlungsbelege set betrag = 1 where id='${b1.id}'`)))));
ok("Büro kann nicht löschen", true, /permission denied/.test(await fehler(() => als(BU, () => q(`delete from public.zahlungsbelege where id='${b1.id}'`)))));
ok("auch Eigentümer (Dienst) kann nicht ändern", true, /nicht geändert oder gelöscht/.test(await fehler(() => q(`update public.zahlungsbelege set betrag = 1 where id='${b1.id}'`))));
ok("auch Eigentümer (Dienst) kann nicht löschen", true, /nicht geändert oder gelöscht/.test(await fehler(() => q(`delete from public.zahlungsbelege where id='${b1.id}'`))));
// Storno
const s1 = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart)
  values ('${A}', '${b1.id}', 'egal', current_date, 999, 'Tippfehler', 'bar') returning *`)))[0];
ok("Storno: neue Nummer, Betrag negativ, Daten vom Original", { n: 6, betrag: "-120.50", art: "ec", name: "Mia Muster", zweck: "Storno zu Beleg Nr. 1: Tippfehler" },
  { n: s1.nummer, betrag: String(s1.betrag), art: s1.zahlart, name: s1.schueler_name, zweck: s1.zweck });
ok("zweites Storno desselben Belegs abgelehnt", true, /duplicate key|eindeutig|ein_storno/.test(await fehler(() => als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values ('${A}', '${b1.id}', 'x', current_date, 1, 'x', 'ec')`)))));
ok("Storno eines Stornos abgelehnt", true, /Storno kann nicht storniert/.test(await fehler(() => als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values ('${A}', '${s1.id}', 'x', current_date, 1, 'x', 'ec')`)))));
ok("Storno eines fremden Belegs abgelehnt", true, /nicht gefunden|row-level/.test(await fehler(() => als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values ('${A}', '${bB.id}', 'x', current_date, 1, 'x', 'ec')`)))));
ok("Storno-Datum = heute (Datum vom Client wirkt nicht)", true, (await q(`select bool_and(datum = current_date) b from public.zahlungsbelege where storno_von is not null`))[0].b);
ok("Storno-Bargeld auch nach Ausschalten möglich", true, await (async () => {
  await als(BU, () => q(`update public.fahrschule_einstellungen set wert='{"aktiv":false}' where fahrschule_id='${A}' and schluessel='beleg.bargeld'`));
  const r = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values ('${A}', '${bBar.id}', 'x', current_date, 1, '', 'ec') returning zahlart, betrag`)))[0];
  return r.zahlart === "bar" && String(r.betrag) === "-30.00";
})());
ok("Spur: Einstellungen protokolliert", true, (await q(`select count(*)::int n from public.aenderungsprotokoll where feld like 'beleg.%'`))[0].n >= 4);

// Rückweg
let e = await fehler(() => db.exec(sql("rueckweg/20261201_w19_02_rueckweg.sql")));
ok("Rückweg bricht ab, solange es punkte.* gibt (erst Rückweg Teil 3)", true, /Rückweg zu Teil 3/.test(e));
ok("Rückweg: punkte.* bleibt erhalten", 1, (await q(`select count(*)::int n from public.fahrschule_einstellungen where schluessel like 'punkte.%'`))[0].n);
await db.exec(`delete from public.fahrschule_einstellungen where schluessel like 'punkte.%'`);
e = await fehler(() => db.exec(sql("rueckweg/20261201_w19_02_rueckweg.sql")));
ok("Rückweg bricht ab, solange Belege da sind", true, /Erst sichern/.test(e));
ok("nach Abbruch alles noch da", 8, (await q(`select count(*)::int n from public.zahlungsbelege`))[0].n);
res = await db.exec(sql("rueckweg/20261201_w19_02_rueckweg.sql").replace("p_trotzdem boolean := false", "p_trotzdem boolean := true"));
ok("Rückweg mit p_trotzdem", { tabellen: 0, funktionen: 0 }, res[res.length - 1].rows[0]);
ok("Rückweg: alter Schlüssel-Constraint", true, /papierkorb.*rueckgaengig\)/.test((await q(`select pg_get_constraintdef(oid) d from pg_constraint where conname='fe_schluessel'`))[0].d));
res = await db.exec(sql("migrations/20261201_w19_02_zahlungsbelege.sql"));
ok("nach Rückweg wieder einspielbar", 2, res[res.length - 1].rows[0].tabellen);

console.log(bad ? `\n${bad} Abweichung(en)` : "\nBelege-SQL-Test: alles in Ordnung.");
process.exit(bad ? 1 : 0);
