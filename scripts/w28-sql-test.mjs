// W28: Termine „nur Büro“ (vortest, simulator, beratung, mpu) in echtem Postgres (PGlite), mit Rückweg.
// Prüft: Fahrlehrer liest/legt an/ändert/löscht diese Arten nicht (auch nicht die eigenen), darf eine Fahrstunde nicht zur
// Büro-Art machen; Fahrstunden bleiben wie vorher; Büro, Leitung, Super-Admin dürfen alles wie vorher; null-Art bleibt sichtbar;
// zweimal einspielbar; Rückweg stellt den alten Stand her.
// Aufruf: npm i --no-save --prefix /tmp/w15-pg @electric-sql/pglite@0.2.17 && NODE_PATH=/tmp/w15-pg/node_modules node scripts/w28-sql-test.mjs
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
const A = "11111111-1111-4111-8111-111111111111";
const BU = "aaaaaaaa-0000-4000-8000-000000000001", FL = "aaaaaaaa-0000-4000-8000-000000000002", SA = "aaaaaaaa-0000-4000-8000-000000000003",
  LA = "aaaaaaaa-0000-4000-8000-000000000004";
let bad = 0;
const ok = (n, e, i) => { const a = JSON.stringify(e), b = JSON.stringify(i); if (a !== b) { bad++; console.log("ABWEICHUNG", n, "erwartet", a, "ist", b); } else console.log("ok ", n); };
const q = async (s, p) => (await db.query(s, p)).rows;
const als = async (uid, fn) => { await db.exec(`set test.uid = '${uid}'; set role authenticated;`); try { return await fn(); } finally { await db.exec(`reset role; set test.uid = ''`); } };
const fehler = async (fn) => { try { await fn(); return "kein Fehler"; } catch (x) { return /row-level security/.test(String(x.message)) ? "RLS" : String(x.message); } };
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to public;
  create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true);
  create table public.kalender_termine (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, schueler_id text, art text, datum date, von text, bis text, geloescht boolean default false);
  alter table public.kalender_termine enable row level security;
  -- vereinfachte Nachbildung der bestehenden (erlaubenden) Regeln
  create policy "Fahrlehrer eigene" on public.kalender_termine for all to authenticated using (fahrlehrer_id = auth.uid()) with check (fahrlehrer_id = auth.uid());
  create policy "Buero/Leitung Fahrschule" on public.kalender_termine for all to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle in ('buero','fahrschule_admin') and p.fahrschule_id = kalender_termine.fahrschule_id))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle in ('buero','fahrschule_admin') and p.fahrschule_id = kalender_termine.fahrschule_id));
  create policy "Super-Admin" on public.kalender_termine for all to authenticated
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'super_admin')) with check (true);
  grant usage on schema public to authenticated, anon;
  grant select, insert, update, delete on public.kalender_termine to authenticated;
  grant select on public.profiles to authenticated;
  insert into public.profiles values ('${BU}','${A}','buero',true),('${FL}','${A}','fahrlehrer',true),('${SA}',null,'super_admin',true),('${LA}','${A}','fahrschule_admin',true);
  insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, art, datum, von, bis) values
    ('f1','${A}','${FL}','fahrstunde','2026-12-03','10:00','11:30'),
    ('v1','${A}','${FL}','vortest','2026-12-03','12:00','13:00'),
    ('s1','${A}','${FL}','simulator','2026-12-03','13:00','14:00'),
    ('b1','${A}','${FL}','beratung','2026-12-03','14:00','15:00'),
    ('m1','${A}','${FL}','mpu','2026-12-03','15:00','16:00'),
    ('e1','${A}','${FL}','ersthilfe','2026-12-04','09:00','17:00'),
    ('n1','${A}','${FL}',null,'2026-12-05','09:00','10:00');
`);
const ids = (uid) => als(uid, async () => (await q("select id from public.kalender_termine order by id")).map((r) => r.id));
ok("vorher: Fahrlehrer sieht alle eigenen", ["b1", "e1", "f1", "m1", "n1", "s1", "v1"], await ids(FL));
let res = await db.exec(sql("migrations/20261206_w28_01_nur_buero_termine.sql"));
ok("Prüf-Abfrage", { regeln: 4, funktionen: 2 }, res[res.length - 1].rows[0]);
res = await db.exec(sql("migrations/20261206_w28_01_nur_buero_termine.sql"));
ok("zweimal einspielbar", { regeln: 4, funktionen: 2 }, res[res.length - 1].rows[0]);

ok("Fahrlehrer sieht keine Büro-Arten (Erste Hilfe, null-Art bleiben)", ["e1", "f1", "n1"], await ids(FL));
ok("Büro sieht alles", ["b1", "e1", "f1", "m1", "n1", "s1", "v1"], await ids(BU));
ok("Leitung sieht alles", ["b1", "e1", "f1", "m1", "n1", "s1", "v1"], await ids(LA));
ok("Super-Admin sieht alles", ["b1", "e1", "f1", "m1", "n1", "s1", "v1"], await ids(SA));
await db.exec("set role anon");
ok("ohne Anmeldung (anon): kein Zugriff", "permission denied for table kalender_termine", await fehler(() => q("select id from public.kalender_termine")));
await db.exec("reset role");

for (const art of ["vortest", "simulator", "beratung", "mpu"]) {
  ok(`Fahrlehrer legt ${art} nicht an`, "RLS", await als(FL, () => fehler(() => q(`insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, art, datum) values ('x_${art}','${A}','${FL}','${art}','2026-12-06')`))));
}
ok("Fahrlehrer legt Fahrstunde an (wie vorher)", "kein Fehler", await als(FL, () => fehler(() => q(`insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, art, datum) values ('f2','${A}','${FL}','fahrstunde','2026-12-06')`))));
ok("Fahrlehrer macht Fahrstunde nicht zum Vortest", "RLS", await als(FL, () => fehler(() => q("update public.kalender_termine set art = 'vortest' where id = 'f2'"))));
ok("Fahrlehrer ändert Vortest nicht (0 Zeilen)", 0, await als(FL, async () => (await db.query("update public.kalender_termine set von = '08:00' where id = 'v1'")).affectedRows));
ok("Fahrlehrer löscht MPU nicht (0 Zeilen)", 0, await als(FL, async () => (await db.query("delete from public.kalender_termine where id = 'm1'")).affectedRows));
ok("Fahrlehrer setzt Simulator nicht auf gelöscht (0 Zeilen)", 0, await als(FL, async () => (await db.query("update public.kalender_termine set geloescht = true where id = 's1'")).affectedRows));
ok("Fahrlehrer ändert eigene Fahrstunde (wie vorher)", 1, await als(FL, async () => (await db.query("update public.kalender_termine set von = '10:15' where id = 'f1'")).affectedRows));
ok("Büro legt MPU an", "kein Fehler", await als(BU, () => fehler(() => q(`insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, art, datum) values ('m2','${A}','${FL}','mpu','2026-12-07')`))));
ok("Büro verschiebt Vortest", 1, await als(BU, async () => (await db.query("update public.kalender_termine set datum = '2026-12-08' where id = 'v1'")).affectedRows));
ok("Büro macht Fahrstunde zur Beratung", 1, await als(BU, async () => (await db.query("update public.kalender_termine set art = 'beratung' where id = 'f2'")).affectedRows));
ok("Leitung löscht (Papierkorb) Simulator", 1, await als(LA, async () => (await db.query("update public.kalender_termine set geloescht = true where id = 's1'")).affectedRows));
ok("nichts verloren", 9, (await q("select count(*)::int as n from public.kalender_termine"))[0].n);

res = await db.exec(sql("rueckweg/20261206_w28_01_rueckweg.sql"));
ok("Rückweg: keine W28-Regel", 0, Number(res[res.length - 1].rows[0].regeln_uebrig));
ok("Rückweg: Fahrlehrer sieht wieder alle eigenen", ["b1", "e1", "f1", "f2", "m1", "m2", "n1", "s1", "v1"], await ids(FL));
ok("Rückweg: Funktionen weg", 0, (await q("select count(*)::int as n from pg_proc where proname in ('termin_art_nur_buero','darf_buero_termine')"))[0].n);
console.log(bad ? `\n${bad} Abweichung(en)` : "\nAlles ok");
process.exit(bad ? 1 : 0);
