// W11 Schritt 3: papierkorb_leeren() mit Frist je Fahrschule (papierkorb.tage) in echtem Postgres (PGlite), mit Rückweg.
// Aufruf: NODE_PATH=$(npm root -g) node scripts/papierkorb-sql-test.mjs   (braucht npm i -g @electric-sql/pglite@0.2.17)
// Grundlage: Prüfskript von Fable (25.11.2026), Schema-Attrappe nur mit dem, was K7 und einst_01 brauchen.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i -g @electric-sql/pglite@0.2.17 und mit NODE_PATH=$(npm root -g) starten.");
  process.exit(1);
}
const R = join(fileURLToPath(new URL(".", import.meta.url)), "..", "supabase") + "/";
const sql = (n) => readFileSync(R + n, "utf8");
const db = new PGlite();
const A="11111111-1111-4111-8111-111111111111",B="22222222-2222-4222-8222-222222222222",C="33333333-3333-4333-8333-333333333333",D="44444444-4444-4444-8444-444444444444";
const BU="aaaaaaaa-0000-4000-8000-000000000001",FL="aaaaaaaa-0000-4000-8000-000000000002",SA="aaaaaaaa-0000-4000-8000-000000000003",LB="aaaaaaaa-0000-4000-8000-000000000004";
let bad=0; const ok=(n,e,i)=>{const a=JSON.stringify(e),b=JSON.stringify(i); if(a!==b){bad++;console.log("ABWEICHUNG",n,"erwartet",a,"ist",b);} else console.log("ok ",n);};
const q=async(s,p)=>(await db.query(s,p)).rows;
await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth to public;
  create table public.fahrschulen (id uuid primary key, name text);
  create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true);
  create table public.kalender_termine (id text primary key, fahrschule_id uuid, datum date, von text, bis text, art text, status text, payload jsonb, geloescht boolean default false);
  create table public.kind (id serial, termin_id text references public.kalender_termine(id));
  create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
  create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') $$;
  create function public.is_buero(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') $$;
  create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') $$;
  create function public.buero_bearbeiter() returns text language sql stable as $$ select null::text $$;
  create function public.my_fahrschule_id() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
  create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
  create function public.zm_darf(fs uuid) returns boolean language sql stable security definer as $$ select true $$;
  insert into public.fahrschulen values ('${A}','A'),('${B}','B'),('${C}','C'),('${D}','D');
  insert into public.profiles values ('${BU}','${A}','buero'),('${FL}','${A}','fahrlehrer'),('${SA}',null,'super_admin'),('${LB}','${B}','fahrschule_admin');
`);
await db.exec(sql("migrations/20261123_k7_01_papierkorb.sql"));
const defK7=(await q(`select pg_get_functiondef('public.papierkorb_leeren()'::regprocedure) d`))[0].d;
await db.exec(sql("migrations/20261125_einst_01_fahrschule_einstellungen.sql"));
let res=await db.exec(sql("migrations/20261128_w11_01_papierkorb_frist.sql"));
ok("Prüf-Abfrage", {funktion_neu:true,frist_std:30,rpc_offen_einst:false,anon_leert:false}, res[res.length-1].rows[0]);
res=await db.exec(sql("migrations/20261128_w11_01_papierkorb_frist.sql"));
ok("zweimal einspielbar", true, res[res.length-1].rows[0].funktion_neu);
await db.exec(`insert into public.fahrschule_einstellungen (fahrschule_id, schluessel, wert) values ('${B}','papierkorb.tage','{"tage":7}'),('${C}','papierkorb.tage','{"tage":90}')`);
const seed=async()=>{ await db.exec(`
  alter table public.kalender_termine disable trigger user;
  delete from public.kind; delete from public.kalender_termine; delete from public.aenderungsprotokoll;
  insert into public.kalender_termine (id,fahrschule_id,datum,von,bis,payload,geloescht,geloescht_am) values
   ('a29','${A}','2026-01-01','10:00','11:00','{}',true, now()-interval '29 days 23 hours'),
   ('a31','${A}','2026-01-01','10:00','11:00','{}',true, now()-interval '30 days 1 hour'),
   ('a_storno','${A}',null,null,null,'{"storno":{"am":"x"}}',true, now()-interval '100 days'),
   ('a_signed','${A}',null,null,null,'{"signed":true}',true, now()-interval '100 days'),
   ('a_signedS','${A}',null,null,null,'{"signed":"true"}',true, now()-interval '100 days'),
   ('a_sigung','${A}',null,null,null,'{"signaturUngueltig":{}}',true, now()-interval '100 days'),
   ('a_nichtgel','${A}',null,null,null,'{}',false, now()-interval '100 days'),
   ('a_ohnezeit','${A}',null,null,null,'{}',true, null),
   ('a_nullpayload','${A}',null,null,null,null,true, now()-interval '100 days'),
   ('a_fk','${A}',null,null,null,'{}',true, now()-interval '100 days'),
   ('b6','${B}',null,null,null,'{}',true, now()-interval '6 days 23 hours'),
   ('b8','${B}',null,null,null,'{}',true, now()-interval '7 days 1 hour'),
   ('c31','${C}',null,null,null,'{}',true, now()-interval '89 days 23 hours'),
   ('c91','${C}',null,null,null,'{}',true, now()-interval '90 days 1 hour'),
   ('n8',null,null,null,null,'{}',true, now()-interval '29 days'),
   ('n31',null,null,null,null,'{}',true, now()-interval '31 days');
  insert into public.kind (termin_id) values ('a_fk');
  alter table public.kalender_termine enable trigger user;`); };
const rest=async()=>(await q(`select id from public.kalender_termine order by id`)).map(r=>r.id).join(",");
// Cron (ohne uid)
await seed(); await db.exec(`set test.uid = ''`);
ok("Cron Anzahl", 5, (await q(`select public.papierkorb_leeren() n`))[0].n);
ok("Cron Rest", "a29,a_fk,a_nichtgel,a_ohnezeit,a_signed,a_signedS,a_sigung,a_storno,b6,c31,n8", await rest());
ok("Cron Spur", [{d:"a31",g:"Papierkorb nach 30 Tagen geleert",a:"2026-01-01 10:00–11:00"},{d:"a_nullpayload",g:"Papierkorb nach 30 Tagen geleert",a:" –"},{d:"b8",g:"Papierkorb nach 7 Tagen geleert",a:" –"},{d:"c91",g:"Papierkorb nach 90 Tagen geleert",a:" –"}],
  await q(`select datensatz_id d, grund g, alt a from public.aenderungsprotokoll where feld='endgueltig_geloescht' order by 1`));
// Büro A als Rolle authenticated
await seed(); await db.exec(`set test.uid = '${BU}'; set role authenticated;`);
ok("Büro A Anzahl", 2, (await q(`select public.papierkorb_leeren() n`))[0].n);
let e=null; try{ await q(`select public.fahrschule_einstellung_zahl(null,'papierkorb.tage','tage',30,7,90)`);}catch(x){e=String(x.message);} ok("direkt abgelehnt", true, /permission denied/.test(e||""));
await db.exec(`reset role`);
ok("Büro A Rest", "a29,a_fk,a_nichtgel,a_ohnezeit,a_signed,a_signedS,a_sigung,a_storno,b6,b8,c31,c91,n31,n8", await rest());
ok("Büro Spur uid", [{u:BU}], await q(`select distinct geaendert_von u from public.aenderungsprotokoll where feld='endgueltig_geloescht'`));
// Leitung B (7 Tage)
await db.exec(`set test.uid = '${LB}'; set role authenticated;`); ok("Leitung B", 1, (await q(`select public.papierkorb_leeren() n`))[0].n); await db.exec(`reset role`);
ok("Leitung B Rest ohne b8", false, (await rest()).includes("b8"));
for (const [n,u] of [["Fahrlehrer",FL],["Super-Admin ohne FS",SA]]) { await db.exec(`set test.uid = '${u}'; set role authenticated;`); ok(n+" = 0", 0, (await q(`select public.papierkorb_leeren() n`))[0].n); await db.exec(`reset role`); }
e=null; try{ await db.exec(`set role anon`); await q(`select public.papierkorb_leeren()`);}catch(x){e=String(x.message);} await db.exec(`reset role`); ok("anon abgelehnt", true, /permission denied/.test(e||""));
// ungültige Werte → 30
await db.exec(`set test.uid=''`);
for (const w of ['{"tage":6}','{"tage":91}','{"tage":"abc"}','{"tage":30.5}','{"tage":-7}','{"tage":null}','{}','{"tage":"0007"}','{"tage":"45"}','{"tage":9999999}','{"tage":7}','{"tage":90}']) {
  await db.query(`insert into public.fahrschule_einstellungen (fahrschule_id,schluessel,wert) values ($1,'papierkorb.tage',$2::jsonb) on conflict (fahrschule_id,schluessel) do update set wert=excluded.wert`,[D,w]);
  console.log("   wert",w,"→",(await q(`select public.fahrschule_einstellung_zahl($1,'papierkorb.tage','tage',30,7,90) z`,[D]))[0].z);
}
// 5000-Grenze + Plan
await seed();
await db.exec(`alter table public.kalender_termine disable trigger user;
  insert into public.kalender_termine (id,fahrschule_id,payload,geloescht,geloescht_am) select 'm'||g, '${A}', '{}', true, now()-interval '40 days' from generate_series(1,5200) g;
  insert into public.kalender_termine (id,fahrschule_id,payload,geloescht) select 'x'||g, '${A}', '{}', false from generate_series(1,40000) g;
  alter table public.kalender_termine enable trigger user; analyze public.kalender_termine;`);
const plan=(await q(`explain analyze select t.id from public.kalender_termine t where t.geloescht and t.geloescht_am is not null
  and t.geloescht_am < now() - interval '7 days'
  and t.geloescht_am < now() - make_interval(days => public.fahrschule_einstellung_zahl(t.fahrschule_id, 'papierkorb.tage', 'tage', 30, 7, 90))
  and jsonb_typeof(t.payload->'storno') is distinct from 'object' and coalesce(t.payload->>'signed', '') <> 'true'
  and jsonb_typeof(t.payload->'signaturUngueltig') is distinct from 'object' limit 5000`)).map(r=>r["QUERY PLAN"]).join("\n");
console.log(plan);
// höchstens 5000 je Lauf (eine Zeile mit Fremdschlüssel bleibt liegen und belegt einen Platz), zusammen alle 5205 löschbaren
let t0=Date.now(); const lauf1=(await q(`select public.papierkorb_leeren() n`))[0].n; console.log("   Dauer ms", Date.now()-t0);
const lauf2=(await q(`select public.papierkorb_leeren() n`))[0].n;
ok("5000-Grenze je Lauf", true, lauf1 <= 5000 && lauf1 >= 4990);
ok("zwei Läufe zusammen alle", 5205, lauf1 + lauf2);
// Rückweg
res=await db.exec(sql("rueckweg/20261128_w11_01_rueckweg.sql")); ok("Rückweg Prüfung", true, res[res.length-1].rows[0].feste_frist);
ok("Rückweg = K7 (functiondef)", true, (await q(`select pg_get_functiondef('public.papierkorb_leeren()'::regprocedure) d`))[0].d===defK7);
ok("Rückweg Rechte", [false,true], [(await q(`select has_function_privilege('anon','public.papierkorb_leeren()','execute') x`))[0].x,(await q(`select has_function_privilege('authenticated','public.papierkorb_leeren()','execute') x`))[0].x]);
await seed(); ok("Rückweg: 30 fest", 5, (await q(`select public.papierkorb_leeren() n`))[0].n); console.log("   Rest", await rest());
console.log(bad ? "Papierkorb-SQL-Test: " + bad + " Fehler" : "Papierkorb-SQL-Test: alles in Ordnung");
if (bad) process.exit(1);
