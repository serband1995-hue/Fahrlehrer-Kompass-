// W26: Kundennummer, Anschrift und Quittungs-Kopie in echtem Postgres (PGlite), mit Rückweg.
// Prüft: Bestand in Anlage-Reihenfolge je Fahrschule (auch gelöschte), neue Schüler fortlaufend, Client-Wert ignoriert,
// Upsert vorhandener Zeilen verbraucht keine Nummer, Nummer unveränderlich (auch ohne Nutzer), Zeile ohne Nummer bekommt beim
// nächsten Ändern eine, Fahrschulwechsel = neue Nummer dort, eindeutig (auch viele in einem Schreibvorgang), PLZ-Prüfung,
// Anschrift gesäubert und im Änderungsverlauf, Beleg mit Kundennummer/Anschrift/Aussteller (Storno übernimmt), zweimal
// einspielbar, Rückweg (bricht mit Daten ab, mit p_trotzdem sauber).
// Aufruf: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 && NODE_PATH=/tmp/w15-pg/node_modules node scripts/kunden-sql-test.mjs
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
const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
const BU = "aaaaaaaa-0000-4000-8000-000000000001", FL = "aaaaaaaa-0000-4000-8000-000000000002", LA = "aaaaaaaa-0000-4000-8000-000000000004";
let bad = 0;
const ok = (n, e, i) => { const a = JSON.stringify(e), b = JSON.stringify(i); if (a !== b) { bad++; console.log("ABWEICHUNG", n, "erwartet", a, "ist", b); } else console.log("ok ", n); };

async function grundDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth to public;
    create table public.fahrschulen (id uuid primary key, name text);
    create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true, name text);
    -- schueler: die Spalten, die W26 und die Auslöser brauchen (wie live)
    create table public.schueler (id text primary key, fahrschule_id uuid not null, fahrlehrer_id uuid, name text not null, telefon text,
      status text not null default 'aktiv', erstellt_am timestamptz default now(), aktualisiert_am timestamptz default now(),
      ausbildung jsonb default '{}'::jsonb, vertrag_am date, klasse text, ausbildungsart text not null default 'neu', reakt_status text not null default 'pruefen',
      reakt_bezahlt_bis date, reakt_notiz text, reakt_betrag numeric, theorie_abgeschlossen_am date, theorie_bestanden_am date, praxis_bestanden_am date,
      b197_testfahrt_am date, inaktiv_seit date, antrag_am date, bewerbernummer text, theorie_frist_bis date, sehhilfe boolean, vorbesitz text[],
      auslands_fs jsonb, wohnsitz_de_seit date, uebersetzung_vorhanden boolean);
    create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
    create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
    create function public.is_buero(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
    create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
    create function public.buero_bearbeiter() returns text language sql stable as $$ select nullif(current_setting('test.bearbeiter', true), '') $$;
    create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
    create or replace function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as $function$
      select coalesce(exists (select 1 from public.profiles p where p.id = auth.uid() and coalesce(p.aktiv, true)) and (is_super_admin(auth.uid())
        or (fs is not null and fs = k5_meine_fahrschule() and (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())))), false);
    $function$;
    -- vereinfachte Zugriffsregel wie live: eigene Fahrschule (Büro/Leitung) bzw. eigene Schüler (Fahrlehrer)
    alter table public.schueler enable row level security;
    create policy s_all on public.schueler for all to authenticated using (fahrschule_id = k5_meine_fahrschule()) with check (fahrschule_id = k5_meine_fahrschule());
    -- schueler_protokoll wie live vor W26 (Auslöser nach dem Ändern)
    create or replace function public.schueler_protokoll() returns trigger language plpgsql security definer set search_path to 'public' as $function$
    declare f text; a text; n text;
    begin
      foreach f in array array['vertrag_am','klasse','bewerbernummer'] loop
        execute format('select ($1).%I::text, ($2).%I::text', f, f) into a, n using old, new;
        if a is distinct from n then insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter)
          values (new.fahrschule_id, 'schueler', new.id, f, a, n, auth.uid(), public.buero_bearbeiter()); end if;
      end loop; return new;
    end $function$;
    create trigger trg_schueler_protokoll after update on public.schueler for each row execute function public.schueler_protokoll();
    grant usage on schema public to authenticated, anon;
    grant select, insert, update on public.schueler to authenticated;
    grant select on public.profiles, public.fahrschulen to authenticated;
    insert into public.fahrschulen values ('${A}','Fahrschule Muster'),('${B}','Fahrschule Fremd');
    insert into public.profiles values ('${BU}','${A}','buero',true,'Büro Muster'),('${FL}','${A}','fahrlehrer',true,'Fahrlehrer Muster'),
      ('${LA}','${A}','fahrschule_admin',true,'Leitung Muster');
    -- Bestand: absichtlich nicht in id-Reihenfolge angelegt; einer gelöscht; zwei mit gleicher Zeit (dann id)
    insert into public.schueler (id, fahrschule_id, name, status, erstellt_am) values
      ('s-c','${A}','Carla Muster','aktiv','2026-03-01'),('s-a','${A}','Anna Muster','aktiv','2026-01-01'),
      ('s-b','${A}','Ben Muster','geloescht','2026-02-01'),('s-e','${A}','Emil Muster','aktiv','2026-04-01'),('s-d','${A}','Dora Muster','aktiv','2026-04-01'),
      ('x-1','${B}','Xaver Muster','aktiv','2026-05-01');
  `);
  await db.exec(sql("migrations/20261125_einst_01_fahrschule_einstellungen.sql"));
  await db.exec(sql("migrations/20261201_w19_02_zahlungsbelege.sql"));
  return db;
}

const db = await grundDb();
const q = async (s, p) => (await db.query(s, p)).rows;
const als = async (uid, fn, bearbeiter = "") => { await db.exec(`set test.uid = '${uid}'; set test.bearbeiter = '${bearbeiter}'; set role authenticated;`); try { return await fn(); } finally { await db.exec(`reset role; set test.uid = ''; set test.bearbeiter = ''`); } };
const fehler = async (fn) => { try { await fn(); return "kein Fehler"; } catch (x) { return String(x.message); } };
const nr = async (id) => (await q(`select kundennummer from public.schueler where id = $1`, [id]))[0]?.kundennummer ?? null;

// Ein Beleg vor der Migration (alter Stand): bleibt unverändert
await db.exec(`insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values ('${A}','beleg.bargeld','{"aktiv":true}')`);
const alterBeleg = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values ('${A}','s-a','x',current_date,10,'Grundbetrag','ec') returning *`)))[0];

let res = await db.exec(sql("migrations/20261205_w26_01_kunden_adresse.sql"));
ok("Prüf-Abfrage", { spalten: 4, ohne_nummer: 0, doppelt: 0, zaehler_ok: true, trigger: 1, beleg_spalten: 3 }, res[res.length - 1].rows[0]);
ok("Bestand A in Anlage-Reihenfolge (auch gelöschte, gleiche Zeit → id)", { "s-a": 1, "s-b": 2, "s-c": 3, "s-d": 4, "s-e": 5 },
  Object.fromEntries((await q(`select id, kundennummer from public.schueler where fahrschule_id = '${A}' order by id`)).map((r) => [r.id, r.kundennummer])));
ok("Bestand B beginnt bei 1", 1, await nr("x-1"));
ok("Bestand: sonst nichts geändert (kein Verlauf, Status/Name gleich)", { log: 0, geloescht: "geloescht", name: "Ben Muster" },
  { log: (await q(`select count(*)::int n from public.aenderungsprotokoll where tabelle = 'schueler'`))[0].n, geloescht: (await q(`select status from public.schueler where id='s-b'`))[0].status, name: (await q(`select name from public.schueler where id='s-b'`))[0].name });
ok("Zähler steht auf der höchsten Nummer", [{ fahrschule_id: A, letzte: 5 }, { fahrschule_id: B, letzte: 1 }], await q(`select * from public.kunden_zaehler order by fahrschule_id`));
ok("Bestands-Schalter ist wieder aus", "", (await q(`select coalesce(current_setting('kompass.w26_bestand', true), '') v`))[0].v);
res = await db.exec(sql("migrations/20261205_w26_01_kunden_adresse.sql"));
ok("zweimal einspielbar, Nummern bleiben", { pruef: res[res.length - 1].rows[0].doppelt, a: await nr("s-a"), e: await nr("s-e") }, { pruef: 0, a: 1, e: 5 });

// Neu anlegen: als Fahrlehrer (App-Brücke) mit erfundener Nummer → Server vergibt die nächste
await als(FL, () => q(`insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, kundennummer) values ('n-1','${A}','${FL}','Neu Muster', 999)`));
ok("neuer Schüler: nächste Nummer, Client-Wert ignoriert", 6, await nr("n-1"));
// Upsert der Brücke (vorhandene Zeile, ohne kundennummer-Spalte) verbraucht keine Nummer
await als(FL, () => q(`insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values ('n-1','${A}','${FL}','Neu Muster'),('s-a','${A}',null,'Anna Muster')
  on conflict (id) do update set name = excluded.name, fahrlehrer_id = excluded.fahrlehrer_id`));
ok("Upsert vorhandener: Nummern gleich, Zähler unverändert", { n1: 6, a: 1, z: 6 }, { n1: await nr("n-1"), a: await nr("s-a"), z: (await q(`select letzte from public.kunden_zaehler where fahrschule_id='${A}'`))[0].letzte });
// Upsert MIT kundennummer (falsche App) ändert nichts
await als(FL, () => q(`insert into public.schueler (id, fahrschule_id, name, kundennummer) values ('n-1','${A}','Neu Muster', 1) on conflict (id) do update set kundennummer = excluded.kundennummer`));
ok("Upsert mit fremder Nummer: bleibt 6", 6, await nr("n-1"));
await als(BU, () => q(`insert into public.schueler (id, fahrschule_id, name) values ('n-2','${A}','Zweit Muster')`));
ok("Büro legt an: 7 (fortlaufend, keine Lücke)", 7, await nr("n-2"));
// Unveränderlich
await als(LA, () => q(`update public.schueler set kundennummer = 1 where id = 'n-2'`));
await q(`update public.schueler set kundennummer = null where id = 'n-2'`); // ohne Nutzer (Dienst-Schlüssel)
ok("Bearbeiten ändert die Nummer nie (Leitung, Dienst-Schlüssel, null)", 7, await nr("n-2"));
await als(BU, () => q(`update public.schueler set name = 'Zweit Muster-Neu', klasse = 'B' where id = 'n-2'`));
ok("Bearbeiten anderer Felder: Nummer bleibt", 7, await nr("n-2"));
// viele in einem Schreibvorgang: alle verschieden, lückenlos
await als(BU, () => q(`insert into public.schueler (id, fahrschule_id, name) select 'm-' || g, '${A}', 'Massen Muster ' || g from generate_series(1, 40) g`));
ok("40 in einem Schreibvorgang: 8..47, eindeutig", { min: 8, max: 47, n: 40, uniq: 40 }, (await q(`select min(kundennummer)::int min, max(kundennummer)::int max, count(*)::int n, count(distinct kundennummer)::int uniq from public.schueler where id like 'm-%'`))[0]);
// Gescheitertes Anlegen verbraucht keine Nummer
ok("PLZ falsch abgelehnt", true, /schueler_plz_format/.test(await fehler(() => als(BU, () => q(`insert into public.schueler (id, fahrschule_id, name, plz) values ('f-1','${A}','Fehler Muster','1234')`)))));
await als(BU, () => q(`insert into public.schueler (id, fahrschule_id, name) values ('n-3','${A}','Dritt Muster')`));
ok("nach Ablehnung keine Lücke: 48", 48, await nr("n-3"));
// Doppelte Nummer direkt erzwingen (z. B. von Hand) → Unique verhindert es
ok("Eindeutigkeit durch die Datenbank", true, /schueler_kundennummer_eindeutig|duplicate/.test(await fehler(async () => {
  await db.exec(`alter table public.schueler disable trigger trg_schueler_kunde_vor`);
  try { await q(`update public.schueler set kundennummer = 1 where id = 'n-3'`); } finally { await db.exec(`alter table public.schueler enable trigger trg_schueler_kunde_vor`); }
})));
// Zeile ohne Nummer (Sicherung zurückgeholt, Auslöser aus) bekommt beim nächsten Ändern die nächste
await db.exec(`alter table public.schueler disable trigger trg_schueler_kunde_vor; insert into public.schueler (id, fahrschule_id, name) values ('r-1','${A}','Rueck Muster'); alter table public.schueler enable trigger trg_schueler_kunde_vor;`);
ok("zurückgeholt ohne Nummer: erst null", null, await nr("r-1"));
await als(BU, () => q(`update public.schueler set klasse = 'B' where id = 'r-1'`));
ok("… beim nächsten Ändern: 49", 49, await nr("r-1"));
// Zähler hinter der höchsten Nummer (zurückgeschriebene Zeile mit Nummer) → nie doppelt
await db.exec(`alter table public.schueler disable trigger trg_schueler_kunde_vor; insert into public.schueler (id, fahrschule_id, name, kundennummer) values ('r-2','${A}','Hoch Muster', 60); alter table public.schueler enable trigger trg_schueler_kunde_vor;`);
await als(BU, () => q(`insert into public.schueler (id, fahrschule_id, name) values ('n-4','${A}','Viert Muster')`));
ok("Zähler holt auf: nach 60 kommt 61", 61, await nr("n-4"));
// Fahrschulwechsel (nur Server): neue Nummer in der anderen Fahrschule
await q(`update public.schueler set fahrschule_id = '${B}' where id = 'n-4'`);
ok("Fahrschulwechsel: nächste Nummer in B", 2, await nr("n-4"));

// Anschrift: gesäubert, leer = null, im Verlauf
await als(FL, () => q(`update public.schueler set strasse = '  Musterweg   12a ', plz = ' 63065 ', ort = ' Offenbach am Main ' where id = 'n-1'`));
ok("Anschrift gesäubert", { strasse: "Musterweg 12a", plz: "63065", ort: "Offenbach am Main" }, (await q(`select strasse, plz, ort from public.schueler where id='n-1'`))[0]);
ok("Anschrift im Änderungsverlauf", ["ort", "plz", "strasse"], (await q(`select feld from public.aenderungsprotokoll where datensatz_id='n-1' order by feld`)).map((r) => r.feld));
await als(BU, () => q(`update public.schueler set ort = '   ' where id = 'n-1'`));
ok("leer = null", null, (await q(`select ort from public.schueler where id='n-1'`))[0].ort);
await als(BU, () => q(`update public.schueler set ort = 'Offenbach am Main' where id = 'n-1'`));
ok("Straße zu lang abgelehnt", true, /schueler_adresse_laenge/.test(await fehler(() => als(BU, () => q(`update public.schueler set strasse = repeat('x', 121) where id = 'n-1'`)))));

// Quittung: Kopie von Kundennummer, Anschrift, Aussteller
const b1 = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart, kundennummer, schueler_adresse, aussteller)
  values ('${A}','n-1','x',current_date,45,'Fahrstunden','bar', 1, '{"strasse":"Falsch"}', 'Falsch') returning *`), "Kristina"))[0];
ok("Beleg: Server setzt Kundennummer/Anschrift/Aussteller", { k: 6, adr: { ort: "Offenbach am Main", plz: "63065", strasse: "Musterweg 12a" }, aus: "Kristina", name: "Neu Muster", nr: 2 },
  { k: b1.kundennummer, adr: b1.schueler_adresse, aus: b1.aussteller, name: b1.schueler_name, nr: b1.nummer });
const b2 = (await als(LA, () => q(`insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values ('${A}','s-c','x',current_date,20,'Lernapp','ec') returning *`)))[0];
ok("Beleg ohne Anschrift: null; Aussteller = Profilname (ohne PIN)", { k: 3, adr: null, aus: "Leitung Muster" }, { k: b2.kundennummer, adr: b2.schueler_adresse, aus: b2.aussteller });
await als(BU, () => q(`update public.schueler set strasse = 'Neuer Weg 1' where id = 'n-1'`));
ok("Beleg bleibt fest, auch wenn sich die Anschrift ändert", "Musterweg 12a", (await q(`select schueler_adresse->>'strasse' s from public.zahlungsbelege where id=$1`, [b1.id]))[0].s);
const st = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, storno_von, schueler_name, datum, betrag, zweck, zahlart) values ('${A}','${b1.id}','x',current_date,1,'falscher Betrag','ec') returning *`), "Kristina"))[0];
ok("Storno übernimmt Kundennummer/Anschrift vom Original", { k: 6, s: "Musterweg 12a", betrag: "-45.00" }, { k: st.kundennummer, s: st.schueler_adresse.strasse, betrag: st.betrag });
ok("alter Beleg unverändert (Felder leer)", { k: null, adr: null, aus: null }, (await q(`select kundennummer k, schueler_adresse adr, aussteller aus from public.zahlungsbelege where id=$1`, [alterBeleg.id]))[0]);
ok("Beleg bleibt unveränderlich", true, /kann nicht geändert/.test(await fehler(() => q(`update public.zahlungsbelege set kundennummer = 9 where id = $1`, [b1.id]))));
ok("Zähler-Tabelle für Nutzer gesperrt", true, /permission denied/.test(await fehler(() => als(BU, () => q(`select * from public.kunden_zaehler`)))));

// Rückweg: bricht mit Daten ab, mit p_trotzdem sauber, danach wieder einspielbar
ok("Rückweg bricht ab, solange Anschriften da sind", true, /Erst sichern/.test(await fehler(() => db.exec(sql("rueckweg/20261205_w26_01_rueckweg.sql")))));
ok("… und hat nichts geändert", 4, (await q(`select count(*)::int n from information_schema.columns where table_name='schueler' and column_name in ('kundennummer','strasse','plz','ort')`))[0].n);
res = await db.exec(sql("rueckweg/20261205_w26_01_rueckweg.sql").replace("p_trotzdem boolean := false", "p_trotzdem boolean := true"));
ok("Rückweg mit p_trotzdem", { spalten: 0, zaehler: false, trigger: 0, beleg_spalten: 0 }, res[res.length - 1].rows[0]);
const b3 = (await als(BU, () => q(`insert into public.zahlungsbelege (fahrschule_id, schueler_id, schueler_name, datum, betrag, zweck, zahlart) values ('${A}','s-a','x',current_date,5,'Lernapp','ec') returning *`)))[0];
ok("nach Rückweg: Belege gehen wie vor W26", { nr: 5, name: "Anna Muster" }, { nr: b3.nummer, name: b3.schueler_name });
await als(BU, () => q(`update public.schueler set bewerbernummer = 'X1' where id = 's-a'`));
ok("nach Rückweg: Verlauf wie vor W26", 1, (await q(`select count(*)::int n from public.aenderungsprotokoll where datensatz_id='s-a' and feld='bewerbernummer'`))[0].n);
res = await db.exec(sql("migrations/20261205_w26_01_kunden_adresse.sql"));
ok("nach Rückweg wieder einspielbar (Bestand neu vergeben)", { ohne: 0, doppelt: 0, a: 1 }, { ohne: res[res.length - 1].rows[0].ohne_nummer, doppelt: res[res.length - 1].rows[0].doppelt, a: await nr("s-a") });

console.log(bad ? `\n${bad} ABWEICHUNG(EN)` : "\nAlles ok.");
process.exit(bad ? 1 : 0);
