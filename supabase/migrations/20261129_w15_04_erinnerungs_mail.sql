-- W15 Schritt 5 „Erinnerungen ohne Zahlung“ (🗣 Serband 24.11.2026: „Es soll angezeigt werden, bei wem was abläuft, und dann
-- werden ihm auf Knopfdruck Erinnerungen geschickt“): Theorie(unterricht), Praxisprüfung nach bestandener Theorie (§ 18 FeV),
-- Führerscheinantrag, Frist der Führerscheinstelle, Umschreiber (§ 29 FeV).
-- 1. erinnerungs_mails: Spur jedes Versands (wie zahlungs_mails, ohne Betrag). Nur fürs Büro lesbar; schreiben nur über
--    erinnerungs_mail_vorbereiten() und die Edge-Funktion erinnerungs-mail (Server).
-- 2. mail_limit(): gemeinsames Limit beider Spuren – 5 Mails je Schüler und Modus, 100 je Fahrschule in 24 Stunden.
--    zahlungs_mail_vorbereiten() (Stand W15 S4, 20261128_w15_03) zählt ab jetzt beide Spuren, sonst unverändert.
-- 3. land_key(), fs_drittstaat(): dieselbe Länder-Regel wie KR.umschreibInfo (kompass-rechnen.js; die Listen sind daraus erzeugt,
--    scripts/erinnerung-sql-test.mjs vergleicht beide).
-- 4. erinnerungs_mail_vorbereiten(schueler, art): prüft Rolle, Fahrschule, aktiven Schüler, rechnet die Frist SELBST (gleiche
--    Regeln und Einstellungen wie Büro und App) und sendet nur, solange sie noch nicht abgelaufen ist und in der Warnzeit liegt.
--    Empfänger bestimmt NUR der Server (wie W14: Schüler/Eltern/beide; Test: nur die Test-Adresse). Test/Echt = derselbe Schalter
--    wie bei den Zahlungs-Mails (fahrschule_zahlungsdaten.modus, ohne Eintrag = Test). Vorlage „vorlagen.erinnerung_<art>“.
-- Voraussetzung: 20261128_w15_03 (W15 S4), 20261127_w15_02, 20261125_einst_01, 20261125_w14_02. Idempotent.
-- Rückweg: supabase/rueckweg/20261129_w15_04_rueckweg.sql (die Spur-Tabelle bleibt dabei stehen).

do $$ begin
  if not exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
                   and prosrc like '%reakt_nicht_faellig%')
     or to_regprocedure('public.fahrschule_einstellung_zahl(uuid,text,text,integer,integer,integer)') is null
     or to_regclass('public.schueler_eltern') is null then
    raise exception 'W15 S5: zuerst 20261128_w15_03 (W15 S4), 20261125_einst_01 und 20261125_w14_02 einspielen';
  end if;
end $$;

-- ---------- 1. Spur ----------
create table if not exists public.erinnerungs_mails (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id) on delete cascade,
  schueler_id text not null,
  art text not null,
  vorlage text,
  frist_am date,
  modus text not null,
  empfaenger_kurz text,
  status text not null default 'vorbereitet',
  fehler text,
  resend_id text,
  gesendet_von uuid,
  bearbeiter text,
  angelegt_am timestamptz not null default now(),
  gesendet_am timestamptz
);
do $$ begin
  alter table public.erinnerungs_mails add constraint em_art check (art in ('theorie', 'antrag', 'behoerde', 'umschreiber'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.erinnerungs_mails add constraint em_status check (status in ('vorbereitet', 'gesendet', 'fehler'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.erinnerungs_mails add constraint em_modus check (modus in ('test', 'echt'));
exception when duplicate_object then null; end $$;
create index if not exists erinnerungs_mails_schueler_idx on public.erinnerungs_mails (fahrschule_id, schueler_id, angelegt_am desc);

alter table public.erinnerungs_mails enable row level security;
drop policy if exists "Erinnerungsmails lesen Buero Leitung" on public.erinnerungs_mails;
create policy "Erinnerungsmails lesen Buero Leitung" on public.erinnerungs_mails for select to authenticated
  using (zm_darf(fahrschule_id));
-- keine Schreib-Regel: schreiben nur erinnerungs_mail_vorbereiten() (security definer) und die Edge-Funktion (Server)
revoke all on public.erinnerungs_mails from anon;
revoke all on public.erinnerungs_mails from authenticated;
grant select on public.erinnerungs_mails to authenticated;

-- ---------- 2. Gemeinsames Limit (der Aufrufer hält die Sperre pg_advisory_xact_lock('zm:' || Fahrschule)) ----------
create or replace function public.mail_limit(p_fs uuid, p_sid text, p_modus text)
 returns text
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select case
    when (select count(*) from public.zahlungs_mails m where m.fahrschule_id = p_fs and m.schueler_id = p_sid and m.modus = p_modus
            and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours')
       + (select count(*) from public.erinnerungs_mails m where m.fahrschule_id = p_fs and m.schueler_id = p_sid and m.modus = p_modus
            and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours') >= 5 then 'zu_viele'
    when (select count(*) from public.zahlungs_mails m where m.fahrschule_id = p_fs and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours')
       + (select count(*) from public.erinnerungs_mails m where m.fahrschule_id = p_fs and m.status <> 'fehler' and m.angelegt_am > now() - interval '24 hours') >= 100
      then 'zu_viele_schule'
  end
$function$;

-- ---------- 3. Länder wie KR.landKey / istEuEwr / istDrittstaat (Listen aus kompass-rechnen.js erzeugt) ----------
create or replace function public.land_key(p text)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  select case l
      when 'tschechische republik' then 'tschechien'
      when 'holland' then 'niederlande'
      when 'slowakische republik' then 'slowakei'
      when 'republik zypern' then 'zypern'
      when 'grossbritannien' then 'vereinigtes koenigreich'
      when 'england' then 'vereinigtes koenigreich'
      when 'usa' then 'vereinigte staaten'
      when 'amerika' then 'vereinigte staaten'
      when 'bosnien' then 'bosnien und herzegowina'
      when 'mazedonien' then 'nordmazedonien'
      when 'moldawien' then 'moldau'
      else l end
  from (select regexp_replace(btrim(regexp_replace(lower(replace(replace(replace(replace(replace(replace(replace(coalesce(p, ''),
         'Ä', 'ae'), 'Ö', 'oe'), 'Ü', 'ue'), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss')), '[[:space:]\u00a0]+', ' ', 'g')), ' +', ' ', 'g') as l) x
$function$;

-- 'kein' (keine Angabe) | 'eu' (ein EU/EWR-Führerschein gilt weiter) | 'land_pruefen' (Land unbekannt) | 'drittstaat'
create or replace function public.fs_drittstaat(p jsonb)
 returns text
 language sql
 immutable
 set search_path to 'public'
as $function$
  with l as (
    select public.land_key(e->>'land') as k from jsonb_array_elements(case when jsonb_typeof(p) = 'array' then p else '[]'::jsonb end) e
     where jsonb_typeof(e) = 'object' and jsonb_typeof(e->'land') = 'string' and e->>'land' <> ''
  )
  select case
    when not exists (select 1 from l) then 'kein'
    when exists (select 1 from l where k <> '' and k = any(array['belgien', 'bulgarien', 'daenemark', 'estland', 'finnland', 'frankreich', 'griechenland', 'irland', 'italien', 'kroatien', 'lettland', 'litauen', 'luxemburg', 'malta', 'niederlande', 'oesterreich', 'polen', 'portugal', 'rumaenien', 'schweden', 'slowakei', 'slowenien', 'spanien', 'tschechien', 'ungarn', 'zypern', 'island', 'liechtenstein', 'norwegen']::text[])) then 'eu'
    when not exists (select 1 from l where k <> '' and k = any(array['schweiz', 'vereinigtes koenigreich', 'tuerkei', 'syrien', 'afghanistan', 'irak', 'iran', 'ukraine', 'russland', 'serbien', 'bosnien und herzegowina', 'kosovo', 'albanien', 'nordmazedonien', 'montenegro', 'moldau', 'georgien', 'marokko', 'tunesien', 'algerien', 'aegypten', 'eritrea', 'aethiopien', 'somalia', 'nigeria', 'ghana', 'indien', 'pakistan', 'sri lanka', 'vietnam', 'china', 'philippinen', 'vereinigte staaten', 'kanada', 'brasilien', 'libanon', 'jordanien', 'belarus', 'armenien', 'aserbaidschan', 'kasachstan', 'japan', 'suedkorea', 'australien', 'neuseeland', 'suedafrika', 'bangladesch', 'thailand', 'kolumbien', 'mexiko', 'argentinien', 'chile', 'peru']::text[])) then 'land_pruefen'
    else 'drittstaat' end
$function$;

-- ---------- 4. Zahlungs-Mail: gemeinsames Limit ----------
create or replace function public.zahlungs_mail_vorbereiten(p_schueler text, p_art text, p_betrag_cent integer, p_wofuer text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  u uuid := auth.uid();
  s record;
  z public.fahrschule_zahlungsdaten;
  an text;
  wf text := btrim(regexp_replace(coalesce(p_wofuer, ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g'));
  sname text;
  zweck text;
  mid uuid;
  fsname text;
  e_an text;
  an_s text;
  an_e text;
  wahl text;
  art_an text;
  alle text[] := array[]::text[];
  kurz text;
  -- W15 S4: Fälligkeit der Reaktivierung und Vorlage
  heute date := (now() at time zone 'Europe/Berlin')::date;
  faellig date;
  bald_t int;
  vorwarn_t int;
  vart text;
  vw jsonb;
  vorlage jsonb := null;
  lim text;
begin
  if u is null then return jsonb_build_object('fehler', 'nicht_angemeldet'); end if;
  if not exists (select 1 from public.profiles p where p.id = u and coalesce(p.aktiv, true)) then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  select x.id::text as id, x.fahrschule_id, x.name, x.email, x.ausbildung, x.reakt_status, x.reakt_bezahlt_bis, x.vertrag_am into s
    from public.schueler x where x.id::text = p_schueler;
  if not found then return jsonb_build_object('fehler', 'kein_schueler'); end if;
  if not zm_darf(s.fahrschule_id) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  if p_art is null or p_art not in ('pruefung', 'reaktivierung', 'zahlung_offen') then
    return jsonb_build_object('fehler', 'art_unbekannt');
  end if;
  if p_betrag_cent is null or p_betrag_cent < 100 or p_betrag_cent > 1000000 then
    return jsonb_build_object('fehler', 'betrag');
  end if;
  if length(wf) < 2 or length(wf) > 80 then return jsonb_build_object('fehler', 'wofuer'); end if;

  -- W15 S4: Reaktivierung nur, wenn sie wirklich ansteht – gleiche Regel wie KR.reaktInfo (Büro/App) und die Sperre:
  -- befreit oder laut Preisliste frei (heute oder am Vertragstag) = nie; sonst überfällig oder innerhalb der Vorwarnzeit
  -- (Einstellung fristen.reaktivierung, Standard 60 Tage, nie kürzer als die Warnzeit). Vor der Fälligkeit: Vorlage „bald“.
  vart := p_art;
  if p_art = 'reaktivierung' then
    if s.reakt_status = 'befreit' then return jsonb_build_object('fehler', 'reakt_befreit'); end if;
    if public.reakt_frei_am(s.fahrschule_id, heute) or public.reakt_frei_am(s.fahrschule_id, s.vertrag_am) then
      return jsonb_build_object('fehler', 'reakt_entfaellt');
    end if;
    faellig := coalesce(s.reakt_bezahlt_bis, (s.vertrag_am + make_interval(months => public.reakt_monate(s.fahrschule_id)))::date);
    if faellig is null then return jsonb_build_object('fehler', 'reakt_ohne_datum'); end if;
    bald_t := public.fahrschule_einstellung_zahl(s.fahrschule_id, 'fristen.reaktivierung', 'bald_tage', 30, 1, 365);
    vorwarn_t := greatest(public.fahrschule_einstellung_zahl(s.fahrschule_id, 'fristen.reaktivierung', 'vorwarn_tage', 60, 1, 365), bald_t);
    if faellig - heute > vorwarn_t then return jsonb_build_object('fehler', 'reakt_nicht_faellig'); end if;
    if faellig >= heute then vart := 'reaktivierung_bald'; end if;
  end if;
  -- Vorlage der Fahrschule (Einstellungen „vorlagen.<art>“): nur Texte, gekürzt; füllen und säubern macht die Edge-Funktion
  vw := public.fahrschule_einstellung(s.fahrschule_id, 'vorlagen.' || vart);
  if vw is not null and jsonb_typeof(vw) = 'object' then
    vorlage := jsonb_strip_nulls(jsonb_build_object(
      'text', case when jsonb_typeof(vw->'text') = 'string' then left(vw->>'text', 2000) end,
      'text_eltern', case when jsonb_typeof(vw->'text_eltern') = 'string' then left(vw->>'text_eltern', 2000) end));
  end if;

  select * into z from public.fahrschule_zahlungsdaten where fahrschule_id = s.fahrschule_id;
  if not found or z.kontoinhaber is null or z.iban is null or not iban_gueltig(z.iban) then
    return jsonb_build_object('fehler', 'zahlungsdaten_fehlen');
  end if;

  -- Limit (gleichzeitige Aufrufe nacheinander): 5 je Schüler und Modus, 100 je Fahrschule in 24 h
  perform pg_advisory_xact_lock(hashtext('zm:' || s.fahrschule_id::text));
  -- W15 S5: Limit gemeinsam mit den Erinnerungen ohne Zahlung (erinnerungs_mails): 5 je Schüler und Modus, 100 je Fahrschule in 24 h
  lim := public.mail_limit(s.fahrschule_id, s.id, z.modus);
  if lim is not null then return jsonb_build_object('fehler', lim); end if;

  -- W14: Empfänger nach der Wahl in der Akte (schueler_eltern): Schüler, Eltern oder beide. Ohne Eltern-Adresse: Schüler.
  an_s := nullif(lower(btrim(coalesce(s.email, ''))), '');
  if an_s is null then an_s := nullif(lower(btrim(coalesce(s.ausbildung->>'email', ''))), ''); end if;
  select e.email, e.mail_an into an_e, e_an from public.schueler_eltern e where e.schueler_id = s.id and e.fahrschule_id = s.fahrschule_id;
  an_e := nullif(lower(btrim(coalesce(an_e, ''))), '');
  wahl := case when an_e is null then 'schueler' when e_an in ('schueler', 'eltern', 'beide') then e_an else 'beide' end;
  if wahl in ('schueler', 'beide') and an_s is not null then alle := alle || an_s; end if;
  if wahl in ('eltern', 'beide') and an_e is not null and not (an_e = any(alle)) then alle := alle || an_e; end if;
  art_an := case when wahl = 'beide' and an_s is null then 'eltern' else wahl end; -- wer angeschrieben wird (Anrede der Mail)
  if z.modus = 'echt' then
    if coalesce(array_length(alle, 1), 0) = 0 then return jsonb_build_object('fehler', 'keine_email'); end if;
    foreach an in array alle loop
      if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;
    end loop;
    an := alle[1];
  else
    -- TEST: nie die Schüler-Adresse. Test-Adresse, sonst die Adresse eines Super-Admins.
    an := z.test_email;
    if an is null then
      select lower(btrim(p.email)) into an from public.profiles p
       where p.rolle = 'super_admin' and coalesce(p.aktiv, true) and nullif(btrim(p.email), '') is not null
       order by p.id limit 1;
    end if;
    if an is null then return jsonb_build_object('fehler', 'keine_testadresse'); end if;
    alle := array[an]; -- TEST: nur die Test-Adresse, egal was gewählt ist
  end if;
  if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;

  -- Verwendungszweck: Name + wofür (EPC: höchstens 140 Zeichen; Name ohne Steuerzeichen, höchstens 57)
  sname := left(btrim(regexp_replace(coalesce(s.name, ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g')), 57);
  zweck := left(sname || ', ' || wf, 140);
  select f.name into fsname from public.fahrschulen f where f.id = s.fahrschule_id;

  select string_agg(left(x, 1) || '***@' || split_part(x, '@', 2), ', ') into kurz from unnest(alle) x;
  insert into public.zahlungs_mails (fahrschule_id, schueler_id, art, betrag_cent, wofuer, modus, empfaenger_kurz, gesendet_von, bearbeiter)
  values (s.fahrschule_id, s.id, p_art, p_betrag_cent, wf, z.modus, kurz, u, public.buero_bearbeiter())
  returning id into mid;

  return jsonb_build_object('ok', true, 'id', mid, 'empfaenger', an, 'empfaenger_alle', to_jsonb(alle), 'an', art_an, 'modus', z.modus, 'art', p_art,
    'betrag_cent', p_betrag_cent, 'wofuer', wf, 'verwendungszweck', zweck, 'schueler_name', sname,
    'fahrschule', fsname, 'kontoinhaber', z.kontoinhaber, 'iban', z.iban, 'bic', z.bic,
    'paypal', z.paypal, 'impressum', z.impressum,
    'vorlage_art', vart, 'vorlage', vorlage, 'faellig_am', faellig, 'tage', case when faellig is not null then faellig - heute end);
end $function$;

revoke all on function public.zahlungs_mail_vorbereiten(text, text, integer, text) from public, anon;
grant execute on function public.zahlungs_mail_vorbereiten(text, text, integer, text) to authenticated;

-- ---------- 5. Erinnerung vorbereiten (alle Prüfungen hier, nicht im Browser) ----------
create or replace function public.erinnerungs_mail_vorbereiten(p_schueler text, p_art text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  u uuid := auth.uid();
  x public.schueler;
  j jsonb;
  fs uuid;
  heute date := (now() at time zone 'Europe/Berlin')::date;
  frist date;
  v date;
  fenster int;
  vart text;
  zmodus text;
  ztest text;
  zimpressum text;
  lim text;
  vw jsonb;
  vorlage jsonb := null;
  an text;
  an_s text;
  an_e text;
  e_an text;
  wahl text;
  art_an text;
  alle text[] := array[]::text[];
  kurz text;
  mid uuid;
  sname text;
  fsname text;
  ist_um boolean;
  land text;
begin
  if u is null then return jsonb_build_object('fehler', 'nicht_angemeldet'); end if;
  if not exists (select 1 from public.profiles p where p.id = u and coalesce(p.aktiv, true)) then
    return jsonb_build_object('fehler', 'keine_berechtigung');
  end if;
  select * into x from public.schueler where id::text = p_schueler;
  if not found then return jsonb_build_object('fehler', 'kein_schueler'); end if;
  j := to_jsonb(x); -- Felder über JSON lesen: unabhängig davon, ob eine Spalte date oder text ist
  fs := nullif(j->>'fahrschule_id', '')::uuid;
  if not zm_darf(fs) then return jsonb_build_object('fehler', 'keine_berechtigung'); end if;
  if p_art is null or p_art not in ('theorie', 'antrag', 'behoerde', 'umschreiber') then
    return jsonb_build_object('fehler', 'art_unbekannt');
  end if;
  if nullif(j->>'inaktiv_seit', '') is not null then return jsonb_build_object('fehler', 'nicht_aktiv'); end if;

  -- Frist wie kompass-rechnen.js (theorieInfo, antragInfo, theorieFristInfo, umschreibInfo) mit den Einstellungen der Fahrschule.
  -- fenster = Warnzeit: zwei Stufen (Theorie, Behörde) bis zur Vorwarnung (nie kürzer als die Warnung), sonst bis zur Warnung.
  vart := 'erinnerung_' || p_art;
  if p_art = 'theorie' then
    if nullif(j->>'theorie_bestanden_am', '') is not null then
      frist := (nullif(j->>'theorie_bestanden_am', '')::date + interval '12 months')::date; vart := 'erinnerung_praxis'; -- § 18 FeV
    elsif nullif(j->>'theorie_abgeschlossen_am', '') is not null then
      frist := (nullif(j->>'theorie_abgeschlossen_am', '')::date
                + make_interval(months => public.fahrschule_einstellung_zahl(fs, 'fristen.theorie', 'monate', 12, 1, 60)))::date;
    end if;
    fenster := greatest(public.fahrschule_einstellung_zahl(fs, 'fristen.theorie', 'vorwarn_tage', 60, 1, 365),
                        public.fahrschule_einstellung_zahl(fs, 'fristen.theorie', 'bald_tage', 30, 1, 365));
  elsif p_art = 'antrag' then
    if nullif(j->>'antrag_am', '') is not null then
      frist := (nullif(j->>'antrag_am', '')::date + make_interval(months => public.fahrschule_einstellung_zahl(fs, 'fristen.antrag', 'monate', 12, 1, 60)))::date;
      if nullif(j->>'theorie_bestanden_am', '') is not null then
        v := (nullif(j->>'theorie_bestanden_am', '')::date + interval '12 months')::date; -- § 18 FeV
        if v > frist then frist := v; end if;
      end if;
    end if;
    fenster := public.fahrschule_einstellung_zahl(fs, 'fristen.antrag', 'bald_tage', 60, 1, 365);
  elsif p_art = 'behoerde' then
    if nullif(j->>'theorie_bestanden_am', '') is not null then return jsonb_build_object('fehler', 'erledigt'); end if;
    frist := nullif(left(j->>'theorie_frist_bis', 10), '')::date;
    fenster := greatest(public.fahrschule_einstellung_zahl(fs, 'fristen.behoerde', 'vorwarn_tage', 60, 1, 365),
                        public.fahrschule_einstellung_zahl(fs, 'fristen.behoerde', 'bald_tage', 30, 1, 365));
  else -- umschreiber: nur Führerschein aus einem Land außerhalb der EU/des EWR, 6 Monate ab Wohnsitz (§ 29 FeV)
    ist_um := j->>'ausbildungsart' = 'umschreibung' or coalesce(case jsonb_typeof(j->'ausbildung'->'umschreiber')
                when 'boolean' then (j->'ausbildung'->>'umschreiber')::boolean
                when 'string' then j->'ausbildung'->>'umschreiber' <> ''
                when 'number' then (j->'ausbildung'->>'umschreiber')::numeric <> 0
                when 'object' then true when 'array' then true else false end, false);
    land := case when ist_um then public.fs_drittstaat(j->'auslands_fs') else 'kein' end;
    if land <> 'drittstaat' then return jsonb_build_object('fehler', 'keine_frist'); end if;
    if nullif(j->>'wohnsitz_de_seit', '') is not null then
      frist := (left(j->>'wohnsitz_de_seit', 10)::date + interval '6 months')::date;
    end if;
    fenster := public.fahrschule_einstellung_zahl(fs, 'fristen.umschreiber', 'bald_tage', 30, 1, 365);
  end if;
  if frist is null then return jsonb_build_object('fehler', 'ohne_datum'); end if;
  if frist < heute then return jsonb_build_object('fehler', 'abgelaufen'); end if;
  if frist - heute > fenster then return jsonb_build_object('fehler', 'nicht_faellig'); end if;

  -- Test/Echt: derselbe Schalter wie bei den Zahlungs-Mails; ohne Eintrag = Test
  select zd.modus, zd.test_email, zd.impressum into zmodus, ztest, zimpressum from public.fahrschule_zahlungsdaten zd where zd.fahrschule_id = fs;
  if zmodus is distinct from 'echt' then zmodus := 'test'; end if;

  perform pg_advisory_xact_lock(hashtext('zm:' || fs::text)); -- dieselbe Sperre wie zahlungs_mail_vorbereiten
  lim := public.mail_limit(fs, x.id::text, zmodus);
  if lim is not null then return jsonb_build_object('fehler', lim); end if;

  -- Empfänger wie W14 (zahlungs_mail_vorbereiten): Schüler, Eltern oder beide; ohne Eltern-Adresse der Schüler
  an_s := nullif(lower(btrim(coalesce(j->>'email', ''))), '');
  if an_s is null then an_s := nullif(lower(btrim(coalesce(j->'ausbildung'->>'email', ''))), ''); end if;
  select e.email, e.mail_an into an_e, e_an from public.schueler_eltern e where e.schueler_id = x.id::text and e.fahrschule_id = fs;
  an_e := nullif(lower(btrim(coalesce(an_e, ''))), '');
  wahl := case when an_e is null then 'schueler' when e_an in ('schueler', 'eltern', 'beide') then e_an else 'beide' end;
  if wahl in ('schueler', 'beide') and an_s is not null then alle := alle || an_s; end if;
  if wahl in ('eltern', 'beide') and an_e is not null and not (an_e = any(alle)) then alle := alle || an_e; end if;
  art_an := case when wahl = 'beide' and an_s is null then 'eltern' else wahl end;
  if zmodus = 'echt' then
    if coalesce(array_length(alle, 1), 0) = 0 then return jsonb_build_object('fehler', 'keine_email'); end if;
    foreach an in array alle loop
      if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;
    end loop;
    an := alle[1];
  else
    -- TEST: nie die Schüler-Adresse. Test-Adresse, sonst die Adresse eines Super-Admins.
    an := lower(btrim(ztest));
    if an is null or an = '' then
      select lower(btrim(p.email)) into an from public.profiles p
       where p.rolle = 'super_admin' and coalesce(p.aktiv, true) and nullif(btrim(p.email), '') is not null
       order by p.id limit 1;
    end if;
    if an is null or an = '' then return jsonb_build_object('fehler', 'keine_testadresse'); end if;
    alle := array[an];
  end if;
  if an !~ '^[^@\s<>",;]+@[^@\s<>",;]+\.[a-z]{2,}$' then return jsonb_build_object('fehler', 'keine_email'); end if;

  vw := public.fahrschule_einstellung(fs, 'vorlagen.' || vart);
  if vw is not null and jsonb_typeof(vw) = 'object' then
    vorlage := jsonb_strip_nulls(jsonb_build_object(
      'text', case when jsonb_typeof(vw->'text') = 'string' then left(vw->>'text', 2000) end,
      'text_eltern', case when jsonb_typeof(vw->'text_eltern') = 'string' then left(vw->>'text_eltern', 2000) end));
  end if;
  sname := left(btrim(regexp_replace(coalesce(j->>'name', ''), '[[:cntrl:]\u0085\u2028\u2029]+', ' ', 'g')), 57);
  select f.name into fsname from public.fahrschulen f where f.id = fs;
  select string_agg(left(y, 1) || '***@' || split_part(y, '@', 2), ', ') into kurz from unnest(alle) y;
  insert into public.erinnerungs_mails (fahrschule_id, schueler_id, art, vorlage, frist_am, modus, empfaenger_kurz, gesendet_von, bearbeiter)
  values (fs, x.id::text, p_art, vart, frist, zmodus, kurz, u, public.buero_bearbeiter())
  returning id into mid;

  return jsonb_build_object('ok', true, 'id', mid, 'empfaenger', an, 'empfaenger_alle', to_jsonb(alle), 'an', art_an, 'modus', zmodus,
    'art', p_art, 'vorlage_art', vart, 'vorlage', vorlage, 'frist_am', frist, 'tage', frist - heute,
    'schueler_name', sname, 'fahrschule', fsname, 'impressum', zimpressum);
end $function$;

revoke all on function public.erinnerungs_mail_vorbereiten(text, text) from public, anon;
grant execute on function public.erinnerungs_mail_vorbereiten(text, text) to authenticated;
revoke all on function public.mail_limit(uuid, text, text) from public, anon, authenticated;
revoke all on function public.land_key(text) from public, anon;
revoke all on function public.fs_drittstaat(jsonb) from public, anon;

-- Ergebnis-Abfrage: erwartet tabelle = 1, rls = true, funktion_neu = true, limit_gemeinsam = true, fuer_anon = false, schreiben_direkt = false
select (select count(*) from pg_tables where schemaname = 'public' and tablename = 'erinnerungs_mails') as tabelle,
       (select relrowsecurity from pg_class where oid = 'public.erinnerungs_mails'::regclass) as rls,
       has_function_privilege('authenticated', 'public.erinnerungs_mail_vorbereiten(text,text)', 'execute') as funktion_neu,
       (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'zahlungs_mail_vorbereiten'
          and prosrc like '%mail_limit%') = 1 as limit_gemeinsam,
       has_function_privilege('anon', 'public.erinnerungs_mail_vorbereiten(text,text)', 'execute') as fuer_anon,
       has_table_privilege('authenticated', 'public.erinnerungs_mails', 'insert') as schreiben_direkt;
