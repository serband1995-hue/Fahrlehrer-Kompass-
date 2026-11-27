// W21: Trockenlauf der Migration 20261203_w21_01 (Prüfungstage mit 55-Minuten-Fenstern), ihres Rückwegs und der Live-Probe
// scripts/sql/w21-2-probe.sql in PGlite (echtes Postgres in Node, ohne Netz, ohne Live-Datenbank).
//
// Ehrlich: PGlite prüft eine ATTRAPPE. Tabellen sind aus dem Code nachgebaut (buero.js, index.html), nicht 1:1 live; die
// Zahlungssperre (termin_zahlung_sperre) ist wörtlich aus 20261123_k8_01. Gleichzeitiges Schreiben aus zwei Verbindungen kann
// PGlite nicht (eine Verbindung): belegt wird die Sperr-Logik nacheinander und der eindeutige Index als zweite Sicherung.
//
// Aufruf:  npm i --silent --no-save --prefix /tmp/w18-pg @electric-sql/pglite@0.2.17
//          NODE_PATH=/tmp/w18-pg/node_modules node scripts/w21-sql-test.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const require = createRequire(import.meta.url);
let PGlite;
try { ({ PGlite } = require("@electric-sql/pglite")); } catch (e) {
  console.error("PGlite fehlt: npm i --silent --no-save --prefix /tmp/w18-pg @electric-sql/pglite@0.2.17 und mit NODE_PATH=/tmp/w18-pg/node_modules starten.");
  process.exit(1);
}
const lies = (p) => readFileSync(join(ROOT, p), "utf8");
const M = lies("supabase/migrations/20261203_w21_01_pruefungstage.sql");
const R = lies("supabase/rueckweg/20261203_w21_01_rueckweg.sql");
const PROBE = lies("scripts/sql/w21-2-probe.sql");
const LESEN = lies("scripts/sql/w21-1-lesen.sql");
const K8 = lies("supabase/migrations/20261123_k8_01_zahlung_sperre.sql");

let faelle = 0, fehler = 0;
function ok(name, bedingung, detail) {
  faelle++;
  if (bedingung) console.log("ok   " + name);
  else { fehler++; console.log("FEHLER " + name + (detail !== undefined ? "\n       " + (typeof detail === "string" ? detail : JSON.stringify(detail)) : "")); }
}

// ---------- 0. Textprüfung ----------
const ohneKomm = (t) => t.replace(/^\s*--.*$/gm, "");
ok("Probe: genau ein DO-Block, endet mit raise W21_ERGEBNIS", (PROBE.match(/^do \$w21p\$/gm) || []).length === 1 && /raise exception 'W21_ERGEBNIS %'/.test(PROBE));
ok("Probe: kein drop/alter/grant/revoke/create", !/\b(drop|alter|grant|revoke|create)\b/i.test(ohneKomm(PROBE)));
ok("Probe: E-Mails nur @example.invalid", !/@(?!example\.invalid)[a-z0-9-]+\.[a-z]+/i.test(ohneKomm(PROBE)));
for (const [n, t] of [["Probe", PROBE], ["Lesen", LESEN], ["Migration", M], ["Rückweg", R]]) ok(n + ": nennt nie das Akademie-Projekt", !t.includes("fxgljvhpikjcejhghgbp"));
const lesenOhne = ohneKomm(LESEN).replace(/'[^']*'/g, "''");
ok("Lesen: keine Schreib-/Struktur-Befehle", !/\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|vacuum|call|perform)\b/i.test(lesenOhne));
ok("Lesen: genau eine Anweisung, beginnt mit select", lesenOhne.split(";").map((x) => x.trim()).filter(Boolean).length === 1 && /^select\b/i.test(lesenOhne.trim()));
ok("Migration: nie Rechte für anon", !/grant[^;]*\banon\b/i.test(ohneKomm(M)));
ok("Migration: jede neue Schreibregel hat ein WITH CHECK mit Rolle", (() => {
  const regeln = ohneKomm(M).split(/create policy /i).slice(1);
  return regeln.every((r) => /for select/i.test(r) || (/with check/i.test(r) && /(is_buero|is_fahrschule_admin|is_super_admin|rolle = 'fahrlehrer')/.test(r.split(/with check/i)[1] || "")));
})());

// ---------- 1. Attrappe ----------
const SR = ["service", "role"].join("_");
const FS = "11111111-1111-1111-1111-111111111111", FS2 = "22222222-2222-2222-2222-222222222222";
const U = { buero: "a0000000-0000-0000-0000-000000000001", fl1: "a0000000-0000-0000-0000-000000000002", fl2: "a0000000-0000-0000-0000-000000000003",
  leitung: "a0000000-0000-0000-0000-000000000004", fremd: "a0000000-0000-0000-0000-000000000005" };

async function baueDb() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role ${SR} bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create table auth.users (instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
      email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz);
    create table public.fahrschulen (id uuid primary key, name text, slug text not null unique);
    insert into public.fahrschulen values ('${FS}', 'Test', 'test'), ('${FS2}', 'Andere', 'andere');
    create table public.profiles (id uuid primary key, email text, name text, rolle text not null default 'fahrlehrer', fahrschule_id uuid, aktiv boolean not null default true, faehrt_selbst boolean default false);
    create function public.handle_new_user() returns trigger language plpgsql security definer set search_path to 'public' as $$
      begin insert into public.profiles (id, email, rolle, aktiv) values (new.id, new.email, 'fahrlehrer', true); return new; end $$;
    create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
    insert into public.profiles (id, rolle, fahrschule_id, aktiv, faehrt_selbst) values ('${U.buero}', 'buero', '${FS}', true, false), ('${U.fl1}', 'fahrlehrer', '${FS}', true, false),
      ('${U.fl2}', 'fahrlehrer', '${FS}', true, false), ('${U.leitung}', 'fahrschule_admin', '${FS}', true, true), ('${U.fremd}', 'fahrlehrer', '${FS2}', true, false);
    create function public.is_super_admin(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin' and aktiv) $$;
    create function public.is_buero(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'buero' and aktiv) $$;
    create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer set search_path to 'public' as $$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin' and aktiv) $$;
    create function public.my_fahrschule_id() returns uuid language sql stable security definer set search_path to 'public' as $$ select fahrschule_id from public.profiles where id = auth.uid() $$;
    alter table public.profiles enable row level security;
    grant select on public.profiles to authenticated;
    create policy "Eigenes Profil lesen" on public.profiles for select using (auth.uid() = id);
    create table public.schueler (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, name text, zahlung_gesperrt_seit timestamptz, zahlung_gesperrt_grund text);
    create function public.schueler_reakt_gesperrt(s public.schueler) returns boolean language sql stable as $$ select false $$;
    create table public.kalender_termine (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, schueler_id text, datum date, von time, bis time,
      art text, fahrzeug text, status text, geloescht boolean default false, geloescht_am timestamptz, payload jsonb, erstellt_von uuid, aktualisiert_am timestamptz);
    create table public.kalender_pruefungen (id text primary key, fahrschule_id uuid, fahrlehrer_id uuid, schueler_id text, datum date, result text, pruefer text,
      attempt int, geloescht boolean default false, payload jsonb, aktualisiert_am timestamptz);
    create table public.pruefungstermine (id uuid primary key default gen_random_uuid(), fahrschule_id uuid, schueler_id text, art text, klasse text, datum date, von time,
      fahrlehrer_id uuid, pruefer text, notiz text, status text default 'geplant', entgelt_bezahlt boolean default false, tuev_gutschein boolean default false,
      as_portal boolean default false, kalender_termin_id text, aktualisiert_am timestamptz, erstellt_am timestamptz default now());
    alter table public.kalender_termine enable row level security;
    alter table public.kalender_pruefungen enable row level security;
    alter table public.pruefungstermine enable row level security;
    alter table public.schueler enable row level security;
    grant select, insert, update, delete on public.kalender_termine, public.kalender_pruefungen, public.pruefungstermine, public.schueler to authenticated;
    create policy "Pruefungstermine Buero Admin" on public.pruefungstermine as permissive for all to authenticated
      using (((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and (fahrschule_id = my_fahrschule_id())))
      with check (((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and (fahrschule_id = my_fahrschule_id())));
    create policy "Pruefungstermine Fahrlehrer lesen" on public.pruefungstermine as permissive for select to authenticated using ((fahrlehrer_id = auth.uid()));
    create policy "Buero alle Termine" on public.kalender_termine for all to authenticated using ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id())
      with check ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id());
    create policy "Fahrlehrer eigene Termine" on public.kalender_termine for all to authenticated using (fahrlehrer_id = auth.uid()) with check (fahrlehrer_id = auth.uid());
    create policy "Buero alle Pruefungen" on public.kalender_pruefungen for all to authenticated using ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id())
      with check ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id());
    create policy "Fahrlehrer eigene Pruefungen" on public.kalender_pruefungen for all to authenticated using (fahrlehrer_id = auth.uid()) with check (fahrlehrer_id = auth.uid());
    create policy "Schueler lesen" on public.schueler for select to authenticated using (fahrschule_id = my_fahrschule_id());
    insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) select 's' || g, '${FS}', case when g <= 6 then '${U.fl1}'::uuid else '${U.fl2}'::uuid end, 'Schüler ' || g from generate_series(1, 14) g;
    insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name, zahlung_gesperrt_seit, zahlung_gesperrt_grund) values ('sg', '${FS}', '${U.fl1}', 'Gesperrt', now(), 'Rechnung offen');
    insert into public.schueler (id, fahrschule_id, fahrlehrer_id, name) values ('sx', '${FS2}', '${U.fremd}', 'Fremd');
  `);
  // Zahlungssperre wörtlich aus K8 (nur die Funktion termin_zahlung_sperre und ihr Auslöser)
  const fn = K8.slice(K8.indexOf("create or replace function public.termin_zahlung_sperre()"), K8.indexOf("-- Sperre setzen/aufheben"));
  await db.exec(`create function public.schueler_buchung_gesperrt(sid text) returns text language sql stable security definer set search_path to 'public' as $$
    select case when s.zahlung_gesperrt_seit is not null then coalesce(nullif(btrim(s.zahlung_gesperrt_grund), ''), 'Zahlung ausstehend') end from public.schueler s where s.id::text = sid $$;`);
  await db.exec(fn);
  // Altbestand vor der Migration: eine Büro-Prüfung mit freier Uhrzeit und Kalender-Spiegel (wie abgleichKalender)
  await db.exec(`insert into public.pruefungstermine (id, fahrschule_id, schueler_id, art, klasse, datum, von, fahrlehrer_id, status, kalender_termin_id)
      values ('00000000-0000-0000-0000-0000000000a1', '${FS}', 's14', 'praxis', 'B', current_date + 20, '10:30', '${U.fl2}', 'geplant', 'ptalt00000000000000001');
    insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art, status, geloescht, payload)
      values ('ptalt00000000000000001', '${FS}', '${U.fl2}', 's14', current_date + 20, '10:30', '12:00', 'pruefung', 'geplant', false, '{"note":"Praxisprüfung (vom Büro geplant)"}');`);
  return db;
}

// Als Person ausführen (eigene Transaktion, Fehler → {fehler})
async function als(db, uid, sql, params) {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [uid || ""]);
    await db.exec(uid === null ? "set local role anon" : "set local role authenticated");
    const r = await db.query(sql, params || []);
    await db.exec("commit");
    return { rows: r.rows, n: r.affectedRows };
  } catch (e) {
    try { await db.exec("rollback"); } catch (e2) {}
    return { fehler: String(e.message || e) };
  }
}
const eins = async (db, sql, p) => (await db.query(sql, p || [])).rows[0];
const alle = async (db, sql, p) => (await db.query(sql, p || [])).rows;

async function probe(db) {
  try { await db.exec(PROBE); return { text: "keine Ausnahme" }; } catch (e) {
    const t = String(e.message || e); const m = t.match(/W21_ERGEBNIS (\{.*\})/s);
    return { text: t, erg: m ? JSON.parse(m[1]) : null };
  }
}

process.on('unhandledRejection', (e) => { console.error('ABBRUCH: ' + (e && e.message)); process.exit(1); });
const db = await baueDb();
const vorher = await eins(db, "select count(*)::int n from public.pruefungstermine");

// ---------- 2. Migration ----------
let f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Migration läuft durch", f === "", f);
f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Zweites Einspielen bricht sauber ab (W21_ABBRUCH)", /W21_ABBRUCH/.test(f), f);
const alt = await eins(db, "select * from public.pruefungstermine where id = '00000000-0000-0000-0000-0000000000a1'");
ok("Altbestand unverändert (freie Uhrzeit, gleiches Datum/Uhrzeit/Kalender)", alt.pruefungstag_id === null && String(alt.von).startsWith("10:30") && alt.kalender_termin_id === "ptalt00000000000000001" && alt.quelle === "buero");

// ---------- 3. Fall 1: Prüfungstag anlegen, 9 Prüfungen hintereinander ----------
let r = await als(db, U.buero, `insert into public.pruefungstage (fahrschule_id, datum, pruefer) values ($1, current_date + 7, 'AB') returning *`, [FS]);
ok("Büro legt Prüfungstag an (Start 08:00, 9 Fenster)", !r.fehler && r.rows[0].fenster_zahl === 9 && String(r.rows[0].start).startsWith("08:00"), r);
const TAG = r.rows[0].id;
const ins9 = Array.from({ length: 9 }, (_, i) => `('${FS}', 's${i + 1}', 'praxis', 'B', '${TAG}', ${i}, '${i < 6 ? U.fl1 : U.fl2}')`).join(",");
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, klasse, pruefungstag_id, fenster, fahrlehrer_id) values ${ins9} returning fenster, to_char(von, 'HH24:MI') von, datum, kalender_termin_id`);
const vons = r.rows ? r.rows.sort((a, b) => a.fenster - b.fenster).map((x) => x.von) : [];
ok("Fall 1: 9 Prüfungen auf einmal, Zeiten 08:00 … 15:20", !r.fehler && vons.join(",") === "08:00,08:55,09:50,10:45,11:40,12:35,13:30,14:25,15:20", r.fehler || vons);
const kal = await alle(db, "select k.* from public.kalender_termine k join public.pruefungstermine p on p.kalender_termin_id = k.id where p.pruefungstag_id = $1", [TAG]);
ok("Server-Spiegel: 9 Kalender-Einträge, 55 Min, ID-Muster 'pt'+20", kal.length === 9 && kal.every((k) => /^pt[0-9a-f]{20}$/.test(k.id) && k.art === "pruefung" && !k.geloescht)
  && kal.some((k) => String(k.von).startsWith("15:20") && String(k.bis).startsWith("16:15")));
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's10', 'praxis', $2, 9, $3)`, [FS, TAG, U.fl2]);
ok("Fenster 10 gibt es nicht", /W21:fenster_ungueltig/.test(r.fehler || ""), r);

// ---------- 4. Fall 2 + Doppelbelegung ----------
const TAG2 = (await als(db, U.buero, `insert into public.pruefungstage (fahrschule_id, datum, pruefer, start) values ($1, current_date + 7, 'CD', '09:00') returning id`, [FS])).rows[0].id;
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's10', 'praxis', $2, 3, $3)`, [FS, TAG, U.fl2]);
ok("Doppelbelegung verweigert (Fenster belegt)", /W21:fenster_belegt/.test(r.fehler || ""), r);
r = await als(db, U.fl2, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's10', 'praxis', $2, 3, $3)`, [FS, TAG, U.fl2]);
ok("Doppelbelegung auch aus der App (Fahrlehrer) verweigert", /W21:fenster_belegt/.test(r.fehler || ""), r);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's10', 'praxis', $2, 0, $3) returning to_char(von,'HH24:MI') von`, [FS, TAG2, U.fl2]);
ok("Fall 2: zweiter Prüfer am selben Datum = eigener Tag, Fenster 1 = 09:00", !r.fehler && r.rows[0].von === "09:00", r);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's1', 'praxis', $2, 1, $3)`, [FS, TAG2, U.fl1]);
ok("Schüler nie zweimal am selben Tag (anderer Prüfer)", /W21:schueler_doppelt/.test(r.fehler || ""), r);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, datum, von, fahrlehrer_id) values ($1, 's1', 'praxis', current_date + 7, '17:00', $2)`, [FS, U.fl1]);
ok("… auch nicht mit freier Uhrzeit (alter Büro-Weg)", /W21:schueler_doppelt/.test(r.fehler || ""), r);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, datum, von) values ($1, 's1', 'theorie', current_date + 7, '17:00')`, [FS]);
ok("Theorieprüfung am selben Tag bleibt erlaubt", !r.fehler, r);
// Zweite Sicherung: eindeutiger Index (auch ohne Auslöser-Sperre)
f = ""; try { await db.exec(`set session_replication_role = replica; insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, datum, status) values ('${FS}', 's12', 'praxis', '${TAG}', 4, current_date + 7, 'geplant');`); } catch (e) { f = String(e.message); }
await db.exec("set session_replication_role = origin");
ok("Eindeutiger Index hält ein Fenster auch ohne Auslöser frei", /pruefungstermine_fenster_frei|duplicate key/.test(f), f);

// ---------- 5. Fall 3: verschieben ----------
const p = async (sid) => eins(db, "select * from public.pruefungstermine where schueler_id = $1 and art = 'praxis' and status <> 'abgesagt' order by datum desc limit 1", [sid]);
const p9 = await p("s9");
r = await als(db, U.buero, `update public.pruefungstermine set pruefungstag_id = $2, fenster = 5 where id = $1 returning to_char(von,'HH24:MI') von`, [p9.id, TAG2]);
const k9 = await eins(db, "select * from public.kalender_termine where id = $1", [p9.kalender_termin_id]);
ok("Fall 3: in anderes Fenster (anderer Tag) verschoben, Kalender zieht mit", !r.fehler && r.rows[0].von === "13:35" && String(k9.von).startsWith("13:35"), r.fehler || [r.rows, k9.von]);
r = await als(db, U.buero, `update public.pruefungstermine set fenster = 0 where id = $1`, [p9.id]);
ok("Verschieben auf belegtes Fenster verweigert", /W21:fenster_belegt/.test(r.fehler || ""), r);

// ---------- 6. Fall 4: tauschen ----------
const a = await p("s1"), b = await p("s2");
r = await als(db, U.buero, `select public.pruefung_tauschen($1, $2)`, [a.id, b.id]);
const a2 = await p("s1"), b2 = await p("s2");
ok("Fall 4: zwei Schüler getauscht", !r.fehler && a2.fenster === 1 && b2.fenster === 0 && String(a2.von).startsWith("08:55"), r.fehler || [a2.fenster, b2.fenster]);
r = await als(db, U.buero, `select public.pruefung_tauschen($1, $2)`, [a.id, p9.id]);
const a3 = await p("s1"), n9 = await p("s9");
ok("Tauschen über zwei Tage", !r.fehler && a3.pruefungstag_id === TAG2 && a3.fenster === 5 && n9.pruefungstag_id === TAG && n9.fenster === 1, r.fehler);
r = await als(db, U.fl1, `select public.pruefung_tauschen($1, $2)`, [(await p("s3")).id, (await p("s8")).id]);
ok("Fahrlehrer kann keinen fremden Schüler tauschen", /W21:(nicht_gefunden|keine_berechtigung)/.test(r.fehler || ""), r);

// Lkw an einem B-Tag: zwei Fenster
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, klasse, pruefungstag_id, fenster, fenster_anzahl, fahrlehrer_id) values ($1, 's11', 'praxis', 'CE', $2, 6, 2, $3) returning kalender_termin_id`, [FS, TAG2, U.fl2]);
const kl = r.rows ? await eins(db, "select to_char(bis,'HH24:MI') bis from public.kalender_termine where id = $1", [r.rows[0].kalender_termin_id]) : {};
ok("Lkw belegt zwei Fenster (14:30, 85 Min im Kalender)", !r.fehler && kl.bis === "15:55", r.fehler || kl);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's12', 'praxis', $2, 7, $3)`, [FS, TAG2, U.fl2]);
ok("Zweites Lkw-Fenster gilt als belegt", /W21:fenster_belegt/.test(r.fehler || ""), r);

// ---------- 7. Fall 5: Fahrlehrer nachträglich ändern ----------
const p3 = await p("s3");
r = await als(db, U.buero, `update public.pruefungstermine set fahrlehrer_id = $2 where id = $1`, [p3.id, U.fl2]);
const k3 = await eins(db, "select fahrlehrer_id from public.kalender_termine where id = $1", [p3.kalender_termin_id]);
ok("Fall 5: Fahrlehrer geändert, Kalender-Eintrag wandert mit", !r.fehler && k3.fahrlehrer_id === U.fl2, r.fehler || k3);
r = await als(db, U.fl1, `update public.pruefungstermine set fahrlehrer_id = $2 where id = $1`, [(await p("s4")).id, U.fl2]);
ok("Fahrlehrer kann eigene Prüfung nicht an Kollegen geben", !!r.fehler || r.n === 0, r);

// ---------- 8. Fall 6: bestanden / nicht bestanden, beide Richtungen ----------
const p5 = await p("s5");
r = await als(db, U.buero, `update public.pruefungstermine set status = 'bestanden' where id = $1`, [p5.id]);
let kp = await eins(db, "select * from public.kalender_pruefungen where id = $1", ["pt-" + p5.id]);
ok("Fall 6: Büro „bestanden“ → kalender_pruefungen pass (für die App)", !r.fehler && kp && kp.result === "pass" && kp.fahrlehrer_id === U.fl1 && !kp.geloescht, r.fehler || kp);
r = await als(db, U.buero, `update public.pruefungstermine set status = 'geplant' where id = $1`, [p5.id]);
kp = await eins(db, "select * from public.kalender_pruefungen where id = $1", ["pt-" + p5.id]);
ok("Büro „Rückgängig“ → Spiegel-Ergebnis gelöscht markiert", !r.fehler && kp.geloescht === true, r.fehler || kp);
const p6 = await p("s6");
r = await als(db, U.fl1, `insert into public.kalender_pruefungen (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, result, payload) values ('app-ex-6', $1, $2, 's6', $3, 'fail', '{"faults":["Vorfahrt"]}')`, [FS, U.fl1, p6.datum]);
ok("Fall 6: App „nicht bestanden“ → Prüfungstafel nicht_bestanden", !r.fehler && (await p("s6")).status === "nicht_bestanden", r.fehler || (await p("s6")).status);
ok("… und kein zweiter Ergebnis-Eintrag", (await eins(db, "select count(*)::int n from public.kalender_pruefungen where schueler_id = 's6' and not geloescht")).n === 1);
r = await als(db, U.buero, `update public.pruefungstermine set status = 'bestanden' where id = $1`, [p6.id]);
kp = await eins(db, "select * from public.kalender_pruefungen where id = 'app-ex-6'");
ok("Büro-Korrektur ändert die App-Zeile (Fehlerpunkte bleiben)", kp.result === "pass" && kp.payload.faults[0] === "Vorfahrt" && !!kp.payload.buero_korrektur_am, kp);
r = await als(db, U.fl1, `update public.pruefungstermine set status = 'nicht_bestanden' where id = $1`, [(await p("s4")).id]);
ok("App setzt Ergebnis an eigener Prüfung direkt", !r.fehler && r.n === 1 && (await p("s4")).status === "nicht_bestanden", r);
ok("… ohne zweite Ergebnis-Zeile (Fahrlehrer schreiben ihr Ergebnis selbst nach kalender_pruefungen)", (await eins(db, "select count(*)::int n from public.kalender_pruefungen where schueler_id = 's4'")).n === 0);
r = await als(db, U.fl1, `update public.kalender_pruefungen set geloescht = true where id = 'app-ex-6'`);
ok("App „Rückgängig“ (Ergebnis gelöscht) → Tafel wieder geplant", !r.fehler && (await p("s6")).status === "geplant", (await p("s6")).status);

// ---------- 9. Startzeit ändern ----------
r = await als(db, U.buero, `update public.pruefungstage set start = '09:00' where id = $1 returning start_geaendert_am`, [TAG]);
const vons2 = (await alle(db, "select fenster, to_char(von,'HH24:MI') von from public.pruefungstermine where pruefungstag_id = $1 and status <> 'abgesagt' order by fenster", [TAG])).map((x) => x.von);
const k1 = await eins(db, "select to_char(k.von,'HH24:MI') von from public.kalender_termine k join public.pruefungstermine p on p.kalender_termin_id = k.id where p.pruefungstag_id = $1 and p.fenster = 0", [TAG]);
ok("Startzeit 09:00: alle Fenster rücken mit, Kalender auch, Merker gesetzt", !r.fehler && vons2[0] === "09:00" && vons2[1] === "09:55" && k1.von === "09:00" && !!r.rows[0].start_geaendert_am, r.fehler || [vons2, k1]);

// ---------- 10. Fahrlehrer in der App ----------
r = await als(db, U.fl1, `insert into public.pruefungstage (fahrschule_id, datum, erstellt_von) values ($1, current_date + 14, $2) returning id`, [FS, U.fl1]);
ok("Fahrlehrer legt Prüfungstag an", !r.fehler, r);
const TAG3 = r.rows && r.rows[0].id;
r = await als(db, U.fl1, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, klasse, pruefungstag_id, fenster, fahrlehrer_id, entgelt_bezahlt, quelle) values ($1, 's5', 'praxis', 'B', $2, 0, $3, true, 'app') returning *`, [FS, TAG3, U.fl1]);
ok("Fahrlehrer plant eigenen Schüler (Haken bleiben Büro-Sache, quelle app)", !r.fehler && r.rows[0].entgelt_bezahlt === false && r.rows[0].quelle === "app" && !!r.rows[0].kalender_termin_id, r);
r = await als(db, U.fl1, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's7', 'praxis', $2, 1, $3)`, [FS, TAG3, U.fl2]);
ok("Fahrlehrer kann nicht für Kollegen anlegen", !!r.fehler, r);
r = await als(db, U.fl1, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 'sx', 'praxis', $2, 1, $3)`, [FS, TAG3, U.fl1]);
ok("… und nicht mit Schüler einer anderen Fahrschule", !!r.fehler, r);
r = await als(db, U.fl2, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's12', 'praxis', $2, 1, $3)`, [FS, TAG3, U.fl2]);
ok("Kollege plant auf demselben Tag ein freies Fenster", !r.fehler, r);
r = await als(db, U.fl1, `select public.pruefungstage_belegung(current_date, current_date + 30) b`);
const t3 = r.rows ? r.rows[0].b.find((t) => t.id === TAG3) : null;
const fremdF = t3 && t3.belegt.find((x) => x.fenster === 1), eigenF = t3 && t3.belegt.find((x) => x.fenster === 0);
ok("Belegung: fremdes Fenster belegt, aber ohne Schüler; eigenes mit Schüler", !!fremdF && fremdF.schueler_id === null && fremdF.eigen === false && eigenF.schueler_id === "s5", r.fehler || t3);
r = await als(db, U.fl1, `update public.pruefungstage set start = '10:00' where id = $1`, [TAG3]);
ok("Fahrlehrer ändert Startzeit nicht, wenn Kollegen-Schüler drin sind", /W21:tag_fremde_pruefungen/.test(r.fehler || ""), r);
r = await als(db, U.fremd, `select public.pruefungstage_belegung(current_date, current_date + 30) b`);
ok("Andere Fahrschule sieht keine Tage", !r.fehler && r.rows[0].b.length === 0, r);
r = await als(db, U.buero, `update public.pruefungstage set geloescht = true where id = $1`, [TAG3]);
ok("Tag mit Prüfungen lässt sich nicht löschen", /W21:tag_nicht_leer/.test(r.fehler || ""), r);
r = await als(db, null, `select count(*) from public.pruefungstage`);
ok("anon hat keine Rechte an pruefungstage", !!r.fehler, r);

// ---------- 11. Übergang: alte Stände ----------
const p7 = await p("s7");
r = await als(db, U.buero, `update public.kalender_termine set bis = '10:20', status = 'geplant', payload = '{"note":"Praxisprüfung (vom Büro geplant)"}' where id = $1`, [p7.kalender_termin_id]);
ok("Alter Büro-Stand trifft dieselbe Kalender-Zeile (kein Doppel)", !r.fehler && (await eins(db, "select count(*)::int n from public.kalender_termine where schueler_id = 's7' and not geloescht")).n === 1, r);
r = await als(db, U.fl2, `update public.kalender_termine set datum = datum + 1, von = '18:00' where id = $1`, [p7.kalender_termin_id]);
const k7 = await eins(db, "select datum, to_char(von,'HH24:MI') von from public.kalender_termine where id = $1", [p7.kalender_termin_id]);
ok("Altes App-Ziehen verschiebt die Spiegel-Zeile nicht", !r.fehler && k7.von === String(p7.von).slice(0, 5) && String(k7.datum) === String(p7.datum), [r, k7, p7.von]);
r = await als(db, U.fl2, `update public.kalender_termine set geloescht = true where id = $1`, [p7.kalender_termin_id]);
ok("Altes App-Löschen löscht die Spiegel-Zeile nicht", (await eins(db, "select geloescht from public.kalender_termine where id = $1", [p7.kalender_termin_id])).geloescht === false, r);
r = await als(db, U.buero, `update public.pruefungstermine set datum = datum + 1, von = '17:00' where id = $1 returning pruefungstag_id, fenster, to_char(von,'HH24:MI') von`, [p7.id]);
ok("Alter Büro-Dialog (Datum/Uhrzeit von Hand) macht freie Uhrzeit, kein Fehler", !r.fehler && r.rows[0].pruefungstag_id === null && r.rows[0].von === "17:00", r);
r = await als(db, U.buero, `update public.pruefungstermine set status = 'abgesagt' where id = $1`, [p7.id]);
ok("Absagen: Kalender-Zeile gelöscht markiert", !r.fehler && (await eins(db, "select geloescht from public.kalender_termine where id = $1", [p7.kalender_termin_id])).geloescht === true, r);
r = await als(db, U.buero, `update public.pruefungstermine set notiz = 'x' where id = '00000000-0000-0000-0000-0000000000a1'`);
ok("Altbestand ändern geht weiter (gleiche Kalender-Zeile)", !r.fehler && (await eins(db, "select count(*)::int n from public.kalender_termine where schueler_id = 's14'")).n === 1, r);

// ---------- 12. Zahlungssperre, Spiegel-Fehler ----------
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 'sg', 'praxis', $2, 3, $3)`, [FS, TAG3, U.fl1]);
ok("Gesperrter Schüler: keine neue Prüfung im Kalender (wie im Büro)", /Zahlung ausstehend/.test(r.fehler || ""), r);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, datum) values ($1, 'sg', 'praxis', current_date + 9)`, [FS]);
ok("Gesperrter Schüler ohne Fahrlehrer/Uhrzeit: speichern geht (wie bisher)", !r.fehler, r);
await db.exec(`create function public.stoerung() returns trigger language plpgsql as $$ begin if new.schueler_id = 's13' then raise exception 'Kalender kaputt'; end if; return new; end $$;
  create trigger trg_test_stoerung before insert on public.kalender_termine for each row execute function public.stoerung();`);
r = await als(db, U.buero, `insert into public.pruefungstermine (fahrschule_id, schueler_id, art, pruefungstag_id, fenster, fahrlehrer_id) values ($1, 's13', 'praxis', $2, 4, $3) returning kalender_fehler`, [FS, TAG3, U.fl2]);
ok("Kalender-Fehler bricht das Speichern nicht ab (steht in kalender_fehler)", !r.fehler && /Kalender kaputt/.test(r.rows[0].kalender_fehler || ""), r);
await db.exec(`drop trigger trg_test_stoerung on public.kalender_termine; drop function public.stoerung();`);

// ---------- 13. Fall 10: Probe ----------
let pr = await probe(db);
ok("Probe ist grün", pr.erg && pr.erg.alle_ok === true, pr.erg || pr.text.slice(0, 400));
ok("Probe hinterlässt nichts", (await eins(db, "select count(*)::int n from public.pruefungstermine where schueler_id like 'w21probe%'")).n === 0);

// ---------- 14. Rückweg ----------
const anzahl = (await eins(db, "select count(*)::int n from public.pruefungstermine")).n;
f = ""; try { await db.exec(R); } catch (e) { f = String(e.message); }
ok("Rückweg läuft", f === "", f);
ok("Rückweg: keine Prüfung verloren, Spalten weg", (await eins(db, "select count(*)::int n from public.pruefungstermine")).n === anzahl && !(await eins(db, "select to_regclass('public.pruefungstage') t")).t);
pr = await probe(db);
ok("Probe schlägt nach Rückweg an (Gegenprobe)", !pr.erg || pr.erg.alle_ok === false, pr.text.slice(0, 200));
f = ""; try { await db.exec(M); } catch (e) { f = String(e.message); }
ok("Nach Rückweg erneut einspielbar", f === "", f);
ok("Vorher-Bestand erhalten", anzahl >= vorher.n);

console.log(`\n${faelle - fehler}/${faelle} ok` + (fehler ? `, ${fehler} FEHLER` : ""));
process.exit(fehler ? 1 : 0);
