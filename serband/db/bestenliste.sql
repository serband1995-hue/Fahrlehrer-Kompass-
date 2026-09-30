-- ============================================================
-- Bestenliste des Reaktionstests (Supabase-Projekt fxgljvhpikjcejhghgbp)
-- Stand: 29.09.2026, eingespielt als Migration
--   website_reaktion_namen_platz_aufraeumen
-- Tabelle public.website_reaktion (id, name, ms, ip_hash, created_at):
-- RLS an, keine Richtlinien, kein direkter Zugriff für anon/authenticated –
-- Zugriff nur über die beiden SECURITY-DEFINER-Funktionen unten.
-- ============================================================

create or replace function public.website_reaktion_eintragen(p_name text, p_ms integer)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_low text;
  v_words text[];
  v_compact text;
  v_ip text;
  v_hash text;
  v_count integer;
  v_platz integer;
  -- längere Wörter: auch als Teil eines Namens unzulässig
  v_bad_teil text[] := array[
    'arsch','fick','fotze','hure','nutte','wichser','hurensohn','schlampe','spast','missgeburt',
    'schwuchtel','kanake','nigger','neger','hitler','fuck','bitch','cunt','pussy','whore','slut',
    'porn','penis','vagina','titten','muschi','schwanz','behindert','mongo','siegheil'
  ];
  -- kurze Wörter: nur als ganzes Wort (sonst träfe „nazi“ auch Nazim, „dick“ auch Dickson);
  -- „heil“ allein ist ein Nachname, nur „sieg heil“ ist gesperrt
  v_bad_wort text[] := array['nazi','dick','sex','isis','kz','shit','opfer','kotz','penner','bastard','spasti'];
  w text;
begin
  -- Name: 2–15 Zeichen; Buchstaben (auch ä ö ü ß, türkisch ç ğ ı İ ş, polnisch, rumänisch …),
  -- Ziffern, Leerzeichen, Punkt, Bindestrich
  if char_length(v_name) < 2 or char_length(v_name) > 15 then
    raise exception 'name_laenge';
  end if;
  if v_name !~ '^[A-Za-zÀ-ÖØ-öø-ÿĀ-žȘ-ț0-9 .\-]+$' then
    raise exception 'name_zeichen';
  end if;

  -- Schimpfwort-Filter: Zahlen-Tricks (0→o, 1→i …) und Akzente (ı→i, ş→s …) vereinheitlichen
  v_low := lower(translate(v_name, '013457@$', 'oieastas'));
  v_low := translate(v_low, 'àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿāăąćĉċčďđēĕėęěĝğġģĥħĩīĭįıĳĵķĸĺļľŀłńņňŉŋōŏőœŕŗřśŝşšţťŧũūŭůűųŵŷźżžșț', 'aaaaaaaceeeeiiiidnoooooouuuuytyaaaccccddeeeeegggghhiiiiiijkklllllnnnnnoooorrrsssstttuuuuuuwyzzzst');
  v_compact := regexp_replace(v_low, '[^a-z]', '', 'g');
  v_words := regexp_split_to_array(btrim(regexp_replace(v_low, '[^a-z]+', ' ', 'g')), ' ');
  foreach w in array v_bad_teil loop
    if position(w in v_compact) > 0 then
      raise exception 'name_unzulaessig';
    end if;
  end loop;
  foreach w in array v_bad_wort loop
    if w = any(v_words) or v_compact = w then
      raise exception 'name_unzulaessig';
    end if;
  end loop;

  -- Zeit: unter 100 ms ist menschlich nicht möglich (Fehlstart-Grenze wie in der Leichtathletik)
  if p_ms is null or p_ms < 100 or p_ms > 1500 then
    raise exception 'zeit_ungueltig';
  end if;

  -- Missbrauchsbremse: höchstens 20 Einträge pro Stunde je Anschluss (IP nur als Prüfwert)
  begin
    v_ip := split_part(coalesce(
      (current_setting('request.headers', true)::json ->> 'cf-connecting-ip'),
      (current_setting('request.headers', true)::json ->> 'x-forwarded-for'),
      ''), ',', 1);
  exception when others then
    v_ip := '';
  end;
  v_hash := encode(extensions.digest('serband-rt:' || v_ip || ':' || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');

  select count(*) into v_count
  from public.website_reaktion
  where ip_hash = v_hash and created_at > now() - interval '1 hour';
  if v_count >= 20 then
    raise exception 'zu_viele_versuche';
  end if;

  insert into public.website_reaktion (name, ms, ip_hash) values (v_name, p_ms, v_hash);

  -- Platz dieses Namens (je Name die beste Zeit), gleiche Reihenfolge wie website_reaktion_top;
  -- vor dem Aufräumen berechnet, damit der eigene Eintrag sicher mitzählt
  with best as (
    select distinct on (lower(r.name)) lower(r.name) as n, r.ms, r.created_at
    from public.website_reaktion r
    order by lower(r.name), r.ms, r.created_at
  ), me as (
    select ms, created_at from best where n = lower(v_name)
  )
  select 1 + count(*) into v_platz
  from best, me
  where (best.ms, best.created_at) < (me.ms, me.created_at);

  -- Aufräumen: Prüfwerte nach 24 h löschen (zusätzlich regelmäßig per pg_cron),
  -- Liste auf die besten 500 Einträge begrenzen
  update public.website_reaktion set ip_hash = null
  where ip_hash is not null and created_at < now() - interval '24 hours';
  delete from public.website_reaktion
  where id in (select id from public.website_reaktion order by ms, created_at offset 500);

  return v_platz;
end;
$function$;

-- Prüfwerte (IP-Hash) spätestens 24 h nach dem Eintrag löschen – unabhängig davon,
-- ob jemand Neues einträgt (Zusage in der Datenschutzerklärung)
select cron.unschedule(jobid) from cron.job where jobname = 'website-reaktion-pruefwerte-loeschen';
select cron.schedule(
  'website-reaktion-pruefwerte-loeschen',
  '*/10 * * * *',
  $cron$ update public.website_reaktion set ip_hash = null where ip_hash is not null and created_at < now() - interval '24 hours' $cron$
);

-- Top 5 (je Name die beste Zeit) – unverändert
create or replace function public.website_reaktion_top()
 returns table(platz integer, name text, ms integer)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with best as (
    select distinct on (lower(r.name)) r.name, r.ms, r.created_at
    from public.website_reaktion r
    order by lower(r.name), r.ms, r.created_at
  )
  select (row_number() over (order by b.ms, b.created_at))::integer, b.name, b.ms
  from best b
  order by b.ms, b.created_at
  limit 5;
$function$;
