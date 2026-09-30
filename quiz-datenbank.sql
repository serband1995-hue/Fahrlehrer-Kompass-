-- Fahrlehrer-Kompass – Live-Quiz „Lernzielkontrolle“: Datenbank (Supabase-Projekt „Fahrlehrer-Kompass“)
-- Stand dieser Datei = eingespielte Migrationen „quiz_lernzielkontrolle“ und „quiz_steuern_absichern“.
-- Nur zur Dokumentation bzw. zum Neuaufsetzen; im Projekt ist alles bereits vorhanden.
--
-- Prinzip: Die Tafel legt einen Raum an, Handys treten per 4-stelligem Code bei. Lösungen, Host-Schlüssel und
-- Spieler-Token liegen in Tabellen ohne Policies (über die API nicht lesbar). Geschrieben wird nur über die Funktionen,
-- Punkte und Zeiten rechnet ausschließlich der Server. Räume samt Namen werden nach einem Tag gelöscht.

create table public.quiz_raeume (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  lektion int not null,
  titel text not null,
  fragen jsonb not null,                 -- [{frage, antworten[]}] ohne Lösungen
  anzahl int not null,
  dauer_s int not null default 15,
  lesezeit_s int not null default 4,
  status text not null default 'lobby' check (status in ('lobby','frage','aufloesung','zwischenstand','ende')),
  frage_nr int not null default -1,
  frage_start timestamptz,               -- ab hier darf geantwortet werden (nach der Lesezeit)
  frage_ende timestamptz,
  aufloesung int,                        -- richtiger Index der aktuellen Frage, erst nach Auflösung gesetzt
  verteilung jsonb,                      -- Anzahl Antworten je Index, erst nach Auflösung gesetzt
  erstellt timestamptz not null default now()
);
create index quiz_raeume_code_idx on public.quiz_raeume (code, erstellt desc);

create table public.quiz_geheim (
  raum_id uuid primary key references public.quiz_raeume(id) on delete cascade,
  host_key uuid not null default gen_random_uuid(),
  loesungen int[] not null
);

create table public.quiz_spieler (
  id uuid primary key default gen_random_uuid(),
  raum_id uuid not null references public.quiz_raeume(id) on delete cascade,
  name text not null,
  punkte int not null default 0,
  richtige int not null default 0,
  serie int not null default 0,
  zeit_richtig_ms bigint not null default 0,  -- 1. Gleichstand-Entscheid: schneller bei richtigen Antworten
  zeit_gesamt_ms bigint not null default 0,   -- 2. Gleichstand-Entscheid: schneller insgesamt (keine Antwort = volle Zeit)
  beantwortet_nr int not null default -1,     -- letzte Frage, auf die geantwortet wurde (für „8 von 12“)
  ausgewertet_nr int not null default -1,
  letzte_richtig boolean,
  letzte_punkte int not null default 0,
  letzte_bonus int not null default 0,
  beigetreten timestamptz not null default clock_timestamp()  -- 3. Gleichstand-Entscheid
);
create index quiz_spieler_raum_idx on public.quiz_spieler (raum_id);
create unique index quiz_spieler_name_idx on public.quiz_spieler (raum_id, lower(name));

create table public.quiz_spieler_geheim (
  spieler_id uuid primary key references public.quiz_spieler(id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

create table public.quiz_antworten (
  spieler_id uuid not null references public.quiz_spieler(id) on delete cascade,
  raum_id uuid not null references public.quiz_raeume(id) on delete cascade,
  frage_nr int not null,
  antwort int not null,
  richtig boolean not null,
  zeit_ms int not null,
  punkte int not null,
  primary key (spieler_id, frage_nr)
);
create index quiz_antworten_raum_idx on public.quiz_antworten (raum_id, frage_nr);

alter table public.quiz_raeume enable row level security;
alter table public.quiz_geheim enable row level security;
alter table public.quiz_spieler enable row level security;
alter table public.quiz_spieler_geheim enable row level security;
alter table public.quiz_antworten enable row level security;

create policy "quiz_raeume lesen" on public.quiz_raeume for select to anon, authenticated using (true);
create policy "quiz_spieler lesen" on public.quiz_spieler for select to anon, authenticated using (true);

revoke all on public.quiz_geheim, public.quiz_spieler_geheim, public.quiz_antworten from anon, authenticated;
revoke insert, update, delete, truncate on public.quiz_raeume, public.quiz_spieler from anon, authenticated;

alter publication supabase_realtime add table public.quiz_raeume, public.quiz_spieler;

-- Serverzeit, damit Handys ihre Uhr abgleichen können
create or replace function public.quiz_zeit() returns timestamptz
language sql stable set search_path = public, pg_temp as $$ select now() $$;

-- Raum anlegen (Tafel)
create or replace function public.quiz_erstellen(p_lektion int, p_titel text, p_fragen jsonb, p_loesungen int[], p_dauer_s int default 15)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_code text; v_id uuid; v_key uuid; v_n int; i int;
begin
  v_n := jsonb_array_length(p_fragen);
  if v_n < 1 or v_n > 20 or coalesce(array_length(p_loesungen,1),0) <> v_n then
    raise exception 'Fragen und Lösungen passen nicht zusammen';
  end if;
  if length(p_fragen::text) > 50000 then raise exception 'Zu viele Daten'; end if;
  for i in 0 .. v_n - 1 loop
    if p_loesungen[i+1] < 0 or p_loesungen[i+1] >= jsonb_array_length(p_fragen->i->'antworten') then
      raise exception 'Lösung % ungültig', i+1;
    end if;
  end loop;
  delete from quiz_raeume where erstellt < now() - interval '1 day';
  loop
    v_code := lpad((floor(random()*9000)+1000)::int::text, 4, '0');
    exit when not exists (select 1 from quiz_raeume where code = v_code and erstellt > now() - interval '1 day');
  end loop;
  insert into quiz_raeume (code, lektion, titel, fragen, anzahl, dauer_s)
    values (v_code, p_lektion, left(p_titel, 80), p_fragen, v_n, greatest(5, least(coalesce(p_dauer_s,15), 60)))
    returning id into v_id;
  insert into quiz_geheim (raum_id, loesungen) values (v_id, p_loesungen) returning host_key into v_key;
  return jsonb_build_object('id', v_id, 'code', v_code, 'host_key', v_key, 'jetzt', now());
end $$;

-- Beitreten (Handy)
create or replace function public.quiz_beitreten(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r quiz_raeume; v_name text; v_versuch text; v_id uuid; v_token uuid; n int := 1; v_vorher int;
begin
  select * into r from quiz_raeume where code = trim(p_code) and erstellt > now() - interval '1 day'
    order by erstellt desc limit 1;
  if r.id is null then raise exception 'RAUM_UNBEKANNT'; end if;
  if r.status = 'ende' then raise exception 'RAUM_BEENDET'; end if;
  v_name := left(regexp_replace(trim(coalesce(p_name,'')), '[[:cntrl:]]', '', 'g'), 18);
  if length(v_name) < 1 then raise exception 'NAME_FEHLT'; end if;
  if (select count(*) from quiz_spieler where raum_id = r.id) >= 80 then raise exception 'RAUM_VOLL'; end if;
  v_versuch := v_name;
  while exists (select 1 from quiz_spieler where raum_id = r.id and lower(name) = lower(v_versuch)) loop
    n := n + 1; v_versuch := v_name || ' ' || n;
  end loop;
  -- Wer später kommt, bekommt verpasste Fragen als volle Zeit angerechnet (fairer Gleichstand-Entscheid)
  v_vorher := case when r.status in ('aufloesung','zwischenstand') then r.frage_nr + 1
                   when r.status = 'frage' then r.frage_nr else 0 end;
  insert into quiz_spieler (raum_id, name, zeit_gesamt_ms, ausgewertet_nr, beantwortet_nr)
    values (r.id, v_versuch, greatest(v_vorher,0)::bigint * r.dauer_s * 1000, v_vorher - 1, v_vorher - 1)
    returning id into v_id;
  insert into quiz_spieler_geheim (spieler_id) values (v_id) returning token into v_token;
  return jsonb_build_object('raum_id', r.id, 'spieler_id', v_id, 'token', v_token, 'name', v_versuch, 'jetzt', now());
end $$;

-- Antworten (Handy). Zählt nur die erste Antwort pro Frage und nur im Zeitfenster (1 s Kulanz für das Netz).
-- FOR SHARE: Eine Antwort kann nicht zwischen Auswertung und Statuswechsel rutschen.
create or replace function public.quiz_antworten_senden(p_spieler uuid, p_token uuid, p_frage int, p_antwort int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r quiz_raeume; g quiz_geheim; s_raum uuid; v_ms int; v_richtig boolean; v_punkte int; v_dauer int;
begin
  select sp.raum_id into s_raum from quiz_spieler sp join quiz_spieler_geheim sg on sg.spieler_id = sp.id
    where sp.id = p_spieler and sg.token = p_token;
  if s_raum is null then raise exception 'SPIELER_UNBEKANNT'; end if;
  select * into r from quiz_raeume where id = s_raum for share;
  if r.status <> 'frage' or r.frage_nr <> p_frage then raise exception 'ZU_SPAET'; end if;
  if now() < r.frage_start then raise exception 'ZU_FRUEH'; end if;
  if now() > r.frage_ende + interval '1 second' then raise exception 'ZU_SPAET'; end if;
  if p_antwort < 0 or p_antwort >= jsonb_array_length(r.fragen->p_frage->'antworten') then raise exception 'ANTWORT_UNGUELTIG'; end if;
  select * into g from quiz_geheim where raum_id = r.id;
  v_dauer := r.dauer_s * 1000;
  v_ms := least(greatest((extract(epoch from (now() - r.frage_start)) * 1000)::int, 0), v_dauer);
  v_richtig := g.loesungen[p_frage + 1] = p_antwort;
  -- Kahoot-Formel: richtig = 500 bis 1000 Punkte, je schneller desto mehr
  v_punkte := case when v_richtig then round(1000 * (1 - (v_ms::numeric / v_dauer) / 2))::int else 0 end;
  insert into quiz_antworten (spieler_id, raum_id, frage_nr, antwort, richtig, zeit_ms, punkte)
    values (p_spieler, r.id, p_frage, p_antwort, v_richtig, v_ms, v_punkte)
    on conflict (spieler_id, frage_nr) do nothing;
  if not found then return jsonb_build_object('ok', false, 'grund', 'SCHON_GEANTWORTET'); end if;
  update quiz_spieler set beantwortet_nr = p_frage where id = p_spieler;
  return jsonb_build_object('ok', true, 'zeit_ms', v_ms);
end $$;

-- Eigenen Spieler prüfen (Handy nach Neuladen); liefert auch die Antwort auf die gerade laufende Frage
create or replace function public.quiz_ich(p_spieler uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object('raum_id', sp.raum_id, 'name', sp.name,
    'antwort', (select a.antwort from quiz_antworten a join quiz_raeume r on r.id = a.raum_id
                where a.spieler_id = sp.id and a.frage_nr = r.frage_nr))
  from quiz_spieler sp join quiz_spieler_geheim sg on sg.spieler_id = sp.id
  where sp.id = p_spieler and sg.token = p_token
$$;

-- Steuerung (Tafel oder Lehrer-Handy). Jeder Übergang nur aus dem erwarteten Zustand und für die erwartete Frage:
-- doppelte oder veraltete Klicks bewirken nichts ({ok:false}).
create or replace function public.quiz_steuern(p_raum uuid, p_key uuid, p_aktion text, p_frage int default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r quiz_raeume; g quiz_geheim; v_dauer int; v_loes int;
  nein constant jsonb := jsonb_build_object('ok', false);
begin
  select * into g from quiz_geheim where raum_id = p_raum and host_key = p_key;
  if g.raum_id is null then raise exception 'KEIN_ZUGRIFF'; end if;
  select * into r from quiz_raeume where id = p_raum for update;
  v_dauer := r.dauer_s * 1000;

  if p_aktion = 'frage' then
    if p_frage is distinct from r.frage_nr + 1 or p_frage >= r.anzahl or r.status not in ('lobby', 'zwischenstand') then
      return nein || jsonb_build_object('jetzt', now());
    end if;
    update quiz_raeume set status = 'frage', frage_nr = p_frage,
      frage_start = now() + make_interval(secs => lesezeit_s),
      frage_ende = now() + make_interval(secs => lesezeit_s + dauer_s),
      aufloesung = null, verteilung = null
      where id = p_raum;

  elsif p_aktion = 'aufloesen' then
    if r.status <> 'frage' or p_frage is distinct from r.frage_nr or now() < r.frage_start then
      return nein || jsonb_build_object('jetzt', now());
    end if;
    v_loes := g.loesungen[r.frage_nr + 1];
    -- Punkte, Serien (Bonus = min(bisherige Serie, 3) × 100) und Zeiten der Spieler fortschreiben
    with a as (
      select sp.id, an.richtig, an.zeit_ms, an.punkte
      from quiz_spieler sp
      left join quiz_antworten an on an.spieler_id = sp.id and an.frage_nr = r.frage_nr
      where sp.raum_id = p_raum and sp.ausgewertet_nr < r.frage_nr
    ), b as (
      select a.*, case when a.richtig then least(sp.serie, 3) * 100 else 0 end as bonus
      from a join quiz_spieler sp on sp.id = a.id
    )
    update quiz_spieler sp set
      punkte = sp.punkte + coalesce(b.punkte, 0) + b.bonus,
      richtige = sp.richtige + case when b.richtig then 1 else 0 end,
      serie = case when b.richtig then sp.serie + 1 else 0 end,
      zeit_richtig_ms = sp.zeit_richtig_ms + case when b.richtig then b.zeit_ms else 0 end,
      zeit_gesamt_ms = sp.zeit_gesamt_ms + coalesce(b.zeit_ms, v_dauer),
      ausgewertet_nr = r.frage_nr,
      letzte_richtig = b.richtig,
      letzte_punkte = coalesce(b.punkte, 0) + b.bonus,
      letzte_bonus = b.bonus
    from b where sp.id = b.id;
    update quiz_raeume set status = 'aufloesung', aufloesung = v_loes,
      verteilung = (select coalesce(jsonb_object_agg(antwort::text, n), '{}'::jsonb)
                    from (select antwort, count(*) n from quiz_antworten
                          where raum_id = p_raum and frage_nr = r.frage_nr group by antwort) x)
      where id = p_raum;

  elsif p_aktion = 'zwischenstand' then
    if r.status <> 'aufloesung' or p_frage is distinct from r.frage_nr or r.frage_nr >= r.anzahl - 1 then
      return nein || jsonb_build_object('jetzt', now());
    end if;
    update quiz_raeume set status = 'zwischenstand' where id = p_raum;

  elsif p_aktion = 'ende' then
    if r.status <> 'aufloesung' or p_frage is distinct from r.frage_nr or r.frage_nr < r.anzahl - 1 then
      return nein || jsonb_build_object('jetzt', now());
    end if;
    update quiz_raeume set status = 'ende' where id = p_raum;

  else
    raise exception 'AKTION_UNBEKANNT';
  end if;
  return jsonb_build_object('ok', true, 'jetzt', now());
end $$;

-- Spieler entfernen (z. B. unpassender Name)
create or replace function public.quiz_entfernen(p_raum uuid, p_key uuid, p_spieler uuid)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from quiz_geheim where raum_id = p_raum and host_key = p_key) then
    raise exception 'KEIN_ZUGRIFF';
  end if;
  delete from quiz_spieler where id = p_spieler and raum_id = p_raum;
end $$;

revoke all on function public.quiz_erstellen(int, text, jsonb, int[], int), public.quiz_beitreten(text, text),
  public.quiz_antworten_senden(uuid, uuid, int, int), public.quiz_ich(uuid, uuid),
  public.quiz_steuern(uuid, uuid, text, int), public.quiz_entfernen(uuid, uuid, uuid), public.quiz_zeit() from public;
grant execute on function public.quiz_erstellen(int, text, jsonb, int[], int), public.quiz_beitreten(text, text),
  public.quiz_antworten_senden(uuid, uuid, int, int), public.quiz_ich(uuid, uuid),
  public.quiz_steuern(uuid, uuid, text, int), public.quiz_entfernen(uuid, uuid, uuid), public.quiz_zeit() to anon, authenticated;

-- Datensparsam: Quiz-Räume samt Namen und Antworten nach einem Tag löschen
select cron.schedule('quiz-aufraeumen', '17 * * * *', $$delete from public.quiz_raeume where erstellt < now() - interval '1 day'$$);
