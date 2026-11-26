-- W20 (26.11.2026) · Zweite Schutzschicht: Die Rolle anon (Aufrufe OHNE Anmeldung) verliert alle Tabellenrechte,
-- die sie nicht braucht. TRUNCATE/TRIGGER/REFERENCES verlieren anon UND authenticated.
--
-- Lage (Live-Abfrage w20-1-lesen 1a, 26.11.2026): anon hatte die Supabase-Standardrechte (SELECT/INSERT/UPDATE/DELETE/
-- TRUNCATE/REFERENCES/TRIGGER) auf 30 Tabellen, darunter profiles, schueler, kalender_termine, snapshots, trinkgeld_privat.
-- Geschützt war alles allein durch RLS (jede Regel hängt an auth.uid(); ohne Anmeldung ist das leer). TRUNCATE prüft RLS
-- gar nicht. Ein einziger Fehler in einer Regel hätte gereicht, damit Fremde ohne Konto Daten sehen oder ändern.
--
-- Wer braucht anon wirklich? (Code-Belege, Stand main ef9bbb5)
--   * Quiz (quiz.html, quiz-tafel.html, quiz-lehrer.html, quiz-gemeinsam.js): Schüler ohne Konto. Schreiben nur über
--     quiz_* RPCs (security definer); LESEN direkt: quiz-gemeinsam.js .from("quiz_raeume") / .from("quiz_spieler") und
--     Realtime auf diesen Tabellen. -> anon behält dort NUR SELECT (hatte live auch nur SELECT/REFERENCES/TRIGGER).
--   * Buchungsseite buchen.html / storno.html: rufen nur die Edge Function public-booking (functions/v1/public-booking).
--     Diese greift laut HS7 (Quelltext v12, 26.11.) auf alle Tabellen nur mit dem Service-Schlüssel zu (service_role,
--     hier nicht verändert). -> anon braucht für public_bookings, profiles, snapshots, push_subscriptions nichts.
--   * einladung.html, check.html, reaktion.html: kein Datenbankzugriff.
--   * App (index.html), Büro (buero.html/buero*.js), theorie.html: Tabellen erst nach Anmeldung (Rolle authenticated).
--     Vor der Anmeldung liefert RLS ohnehin 0 Zeilen; künftig gibt es dort stattdessen „permission denied“.
--   * Edge Functions mit Service-Schlüssel: service_role bleibt unverändert.
--   * RPC-Funktionen: werden hier NICHT angefasst (EXECUTE bleibt). Begründung im W20-Bericht: alle security-definer-
--     Funktionen prüfen auth.uid(); ein Entzug über PUBLIC könnte Speicher-Regeln (storage) ungewollt brechen.
--
-- Was diese Migration macht (eine Transaktion, ein DO-Block):
--   0. Sicherung: Rechte von anon, authenticated und PUBLIC auf allen Tabellen/Sichten/Sequenzen in public vorher nach
--      sicherung.w20_rechte_vorher (Schema ohne Rechte für anon/authenticated, siehe K1). Der Rückweg stellt sie daraus her.
--   1. anon: REVOKE ALL auf jeder Tabelle/Sicht in public, AUSSER quiz_raeume und quiz_spieler (dort nur SELECT behalten).
--   2. authenticated: REVOKE TRUNCATE, TRIGGER, REFERENCES auf jeder Tabelle in public (die App braucht keins davon;
--      SELECT/INSERT/UPDATE/DELETE bleiben genau wie vorher, RLS-Regeln bleiben unverändert).
--   3. anon: REVOKE ALL auf allen Sequenzen in public (anon fügt nirgends selbst ein).
--   4. Standardrechte für KÜNFTIGE Tabellen/Sequenzen, die die Rolle postgres anlegt: anon bekommt nichts mehr,
--      authenticated kein TRUNCATE/TRIGGER/REFERENCES. Neue Tabellen, die anon wirklich braucht, brauchen dann ein
--      ausdrückliches GRANT in ihrer Migration. (Standardrechte von supabase_admin kann postgres nicht ändern.)
--   Keine RLS-Regel wird geändert (Lehre aus W18 betrifft diese Migration nicht: kein FOR ALL/UPDATE angefasst).
-- Abbruch ohne Änderung, wenn: die beiden Quiz-Tabellen fehlen, die Sicherung schon existiert (doppelt eingespielt) oder
-- die ausführende Rolle die Standardrechte von postgres nicht ändern darf.
-- Live-Probe: scripts/sql/w20-2-probe.sql (Teil A). Rückweg: supabase/rueckweg/20261201_w20_01_rueckweg.sql
do $w20a$
declare
  r record;
  v_quiz constant text[] := array['quiz_raeume', 'quiz_spieler'];
  v_tab int := 0;
  v_seq int := 0;
begin
  -- ---------- Vorprüfung (nichts geändert) ----------
  if to_regclass('public.quiz_raeume') is null or to_regclass('public.quiz_spieler') is null then
    raise exception 'W20_ABBRUCH: quiz_raeume/quiz_spieler fehlen – Lage anders als in w20-1-lesen, bitte neu lesen.';
  end if;
  if to_regclass('sicherung.w20_rechte_vorher') is not null then
    raise exception 'W20_ABBRUCH: sicherung.w20_rechte_vorher existiert schon (Migration schon eingespielt?). Erst Rückweg oder Tabelle prüfen.';
  end if;
  if not pg_has_role(current_user, 'postgres', 'MEMBER') then
    raise exception 'W20_ABBRUCH: Rolle % darf die Standardrechte von postgres nicht ändern.', current_user;
  end if;

  -- ---------- 0. Sicherung ----------
  create schema if not exists sicherung;
  revoke all on schema sicherung from public, anon, authenticated;
  create table sicherung.w20_rechte_vorher (
    objekt text not null,          -- Tabellen-/Sequenzname in public
    art "char" not null,           -- relkind: r, p, v, m, f, S
    rolle text not null,           -- anon, authenticated, PUBLIC
    rechte text[] not null,
    gesichert_am timestamptz not null default now(),
    primary key (objekt, art, rolle)
  );
  revoke all on sicherung.w20_rechte_vorher from public, anon, authenticated;
  alter table sicherung.w20_rechte_vorher enable row level security;

  insert into sicherung.w20_rechte_vorher (objekt, art, rolle, rechte)
  select c.relname, c.relkind,
         case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee)::text end,
         array_agg(a.privilege_type::text order by a.privilege_type)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(coalesce(c.relacl, acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a
   where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
   group by 1, 2, 3;

  -- ---------- 1. + 2. Tabellen und Sichten ----------
  for r in
    select c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f') order by c.relname
  loop
    if r.relname = any (v_quiz) then
      execute format('revoke insert, update, delete, truncate, references, trigger on public.%I from anon', r.relname);
    else
      execute format('revoke all on public.%I from anon', r.relname);
    end if;
    execute format('revoke truncate, references, trigger on public.%I from authenticated', r.relname);
    v_tab := v_tab + 1;
  end loop;

  -- ---------- 3. Sequenzen ----------
  for r in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'S'
  loop
    execute format('revoke all on sequence public.%I from anon', r.relname);
    v_seq := v_seq + 1;
  end loop;

  -- ---------- 4. Standardrechte für künftige Tabellen/Sequenzen ----------
  alter default privileges for role postgres in schema public revoke all on tables from anon;
  alter default privileges for role postgres in schema public revoke truncate, references, trigger on tables from authenticated;
  alter default privileges for role postgres in schema public revoke all on sequences from anon;

  raise notice 'W20_01 fertig: % Tabellen/Sichten, % Sequenzen; Sicherung: % Zeilen', v_tab, v_seq,
    (select count(*) from sicherung.w20_rechte_vorher);
end $w20a$;
