-- W21 (27.11.2026) · Prüfungstage mit festen 55-Minuten-Fenstern – EINE Quelle für App und Büro.
--
-- Wunsch Serband (26.11.2026): Neuer Prüfungstag → 9 Fenster à 55 Min (Start 08:00: 08:00–08:55 … 15:20–16:15), keine Uhrzeit
-- mehr tippen, belegte Fenster nie doppelt, mehrere Schüler hintereinander, Verschieben/Tauschen/Fahrlehrer ändern/Ergebnis,
-- App und Büro zeigen dasselbe.
--
-- Vorher: App-Tafel nur im persönlichen Snapshot (snapshots.data.termine), Büro in pruefungstermine (+ Kalender-Spiegel aus dem
-- Büro-Browser). Jetzt: pruefungstermine ist die EINE Quelle für geplante Prüfungen, auch für die App.
--
-- Was diese Migration tut:
--  1. Neue Tabelle pruefungstage (ein Prüfer an einem Datum = ein Tag; zwei Prüfer = zwei Tage). Start änderbar, Fenster rücken mit.
--  2. pruefungstermine + pruefungstag_id, fenster (0..), fenster_anzahl (1; Lkw an einem B-Tag 2), quelle ('buero'|'app'),
--     kalender_fehler (Text, wenn der Kalender-Spiegel nicht ging). Bestehende Zeilen bleiben unverändert (pruefungstag_id null =
--     freie Uhrzeit wie bisher).
--  3. Auslöser pt_schutz (BEFORE INSERT/UPDATE auf pruefungstermine), alles serverseitig, auch bei gleichzeitigem Schreiben:
--     - Fenster: Tag-Zeile wird gesperrt (FOR UPDATE, App und Büro warten aufeinander), datum/von kommen aus dem Tag,
--       Überschneidung mit einem anderen nicht abgesagten Fenster → Fehler „W21:fenster_belegt“.
--     - Ein Schüler nie zweimal am selben Tag (Praxis, nicht abgesagt) → „W21:schueler_doppelt“ (nur wenn Schüler/Datum/Status
--       sich ändern; Altdaten mit Doppeln bleiben, wie sie sind).
--     - Ändert ein alter Büro-Stand Datum oder Uhrzeit einer Fenster-Prüfung von Hand, wird sie zur freien Uhrzeit (kein Fehler).
--     - Fahrlehrer (nicht Büro/Leitung): Haken (Entgelt, TÜV, AS) und Notiz bleiben, wie das Büro sie gesetzt hat.
--     - Zahlungssperre wie im Büro heute: keine neue künftige Praxisprüfung im Kalender für gesperrte Schüler („Zahlung ausstehend“).
--     - Kalender-Spiegel macht der SERVER (vorher der Büro-Browser in abgleichKalender): gleiche Zeile über kalender_termin_id,
--       neue IDs im selben Muster 'pt' + 20 Zeichen. Alte Büro-Stände treffen dieselbe Zeile (sie haben die ID aus der Antwort).
--       Ein Fehler beim Spiegel bricht das Speichern NICHT ab, er steht in kalender_fehler.
--  4. Auslöser kt_pruefung_spiegel (BEFORE UPDATE auf kalender_termine, läuft als erster): Datum, Uhrzeit, Fahrlehrer, Schüler,
--     Art und „gelöscht“ einer Spiegelzeile bestimmt nur pruefungstermine. Ein altes App-Ziehen/-Löschen setzt sie still zurück.
--  5. Ergebnis an EINER Stelle: kalender_pruefungen (App) → pruefungstermine.status und pruefungstermine.status (Büro) →
--     kalender_pruefungen (Zeile 'pt-<id>' oder die vorhandene App-Zeile). Fehlerpunkte (payload.faults) bleiben App-Sache.
--  6. RPCs: pruefung_tauschen(a, b) (Rechte wie beim Ändern), pruefungstage_belegung(von, bis) (frei/belegt; Schüler nur eigene).
--  7. Rechte: Fahrlehrer dürfen eigene Prüfungen anlegen/ändern (fahrlehrer_id = ich, Schüler der eigenen Fahrschule).
--     Nie für anon. WITH CHECK prüft die Rolle (Lehre W18).
-- Rückweg: supabase/rueckweg/20261203_w21_01_rueckweg.sql
-- Nach dem Lese-Ergebnis (scripts/sql/w21-1-lesen.sql) anzupassen: Spaltentypen von pruefungstermine (von = time angenommen,
-- schueler_id = text angenommen) und die Auslöser auf kalender_termine (Spiegel-Schreiben ist in eigener Funktion pt_kalender_spiegel).

do $w21$
begin
  if to_regclass('public.pruefungstage') is not null then raise exception 'W21_ABBRUCH: Tabelle pruefungstage gibt es schon.'; end if;
  if to_regclass('public.pruefungstermine') is null then raise exception 'W21_ABBRUCH: pruefungstermine fehlt.'; end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pruefungstermine' and column_name = 'pruefungstag_id') then
    raise exception 'W21_ABBRUCH: pruefungstermine.pruefungstag_id gibt es schon.';
  end if;
end $w21$;

-- ---------- 1. Prüfungstage ----------
create table public.pruefungstage (
  id uuid primary key default gen_random_uuid(),
  fahrschule_id uuid not null references public.fahrschulen(id),
  datum date not null,
  start time not null default '08:00',
  fenster_zahl smallint not null default 9 check (fenster_zahl between 1 and 12),
  pruefer text check (pruefer is null or char_length(pruefer) <= 10),
  notiz text check (notiz is null or char_length(notiz) <= 200),
  erstellt_von uuid default auth.uid(),
  erstellt_am timestamptz not null default now(),
  aktualisiert_am timestamptz not null default now(),
  start_geaendert_am timestamptz,
  geloescht boolean not null default false
);
create index pruefungstage_fs_datum on public.pruefungstage (fahrschule_id, datum) where not geloescht;
comment on table public.pruefungstage is 'W21: Prüfungstag = ein Prüfer an einem Datum mit festen 55-Minuten-Fenstern (B/BE). Fenster i beginnt um start + i*55 Min.';

alter table public.pruefungstage enable row level security;
revoke all on public.pruefungstage from anon, authenticated;
grant select, insert, update on public.pruefungstage to authenticated;

create policy "Pruefungstage Buero Leitung" on public.pruefungstage as permissive for all to authenticated
  using ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id())
  with check ((is_buero(auth.uid()) or is_fahrschule_admin(auth.uid())) and fahrschule_id = my_fahrschule_id());
create policy "Pruefungstage Super Admin" on public.pruefungstage as permissive for all to authenticated
  using (is_super_admin(auth.uid())) with check (is_super_admin(auth.uid()));
create policy "Pruefungstage Fahrlehrer lesen" on public.pruefungstage as permissive for select to authenticated
  using (fahrschule_id = my_fahrschule_id() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv));
create policy "Pruefungstage Fahrlehrer anlegen" on public.pruefungstage as permissive for insert to authenticated
  with check (fahrschule_id = my_fahrschule_id() and erstellt_von = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv));
create policy "Pruefungstage Fahrlehrer eigene aendern" on public.pruefungstage as permissive for update to authenticated
  using (erstellt_von = auth.uid() and fahrschule_id = my_fahrschule_id())
  with check (erstellt_von = auth.uid() and fahrschule_id = my_fahrschule_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv));

-- Tag ändern: Fahrlehrer dürfen Start/Datum/Löschen nur, solange nur ihre eigenen Prüfungen drin sind; Löschen nur leere Tage.
create or replace function public.pruefungstag_schutz()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare v_buero boolean := auth.uid() is null or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid());
begin
  new.aktualisiert_am := now();
  -- Das letzte Fenster muss vor Mitternacht enden (sonst liefe die Uhrzeit über 24 Uhr)
  if extract(epoch from new.start)::int / 60 + new.fenster_zahl * 55 > 23 * 60 + 59 then
    raise exception 'W21:start_zu_spaet' using errcode = 'P0001', hint = 'Das letzte Fenster muss vor Mitternacht enden.';
  end if;
  if tg_op = 'INSERT' then
    if new.erstellt_von is null then new.erstellt_von := auth.uid(); end if;
    return new;
  end if;
  new.erstellt_von := old.erstellt_von; new.erstellt_am := old.erstellt_am; new.fahrschule_id := old.fahrschule_id;
  if new.start is distinct from old.start then new.start_geaendert_am := now(); end if;
  if new.geloescht and not old.geloescht
     and exists (select 1 from public.pruefungstermine q where q.pruefungstag_id = old.id and q.status <> 'abgesagt') then
    raise exception 'W21:tag_nicht_leer' using errcode = 'P0001', hint = 'Erst alle Prüfungen des Tages verschieben oder absagen.';
  end if;
  if (new.start is distinct from old.start or new.datum is distinct from old.datum)
     and exists (select 1 from public.pruefungstermine q where q.pruefungstag_id = old.id and q.status in ('bestanden', 'nicht_bestanden')) then
    raise exception 'W21:tag_hat_ergebnisse' using errcode = 'P0001', hint = 'An diesem Tag stehen schon Ergebnisse. Uhrzeit und Datum bleiben.';
  end if;
  if not v_buero and (new.start is distinct from old.start or new.datum is distinct from old.datum or new.fenster_zahl is distinct from old.fenster_zahl)
     and exists (select 1 from public.pruefungstermine q where q.pruefungstag_id = old.id and q.status <> 'abgesagt'
                   and q.fahrlehrer_id is distinct from auth.uid()) then
    raise exception 'W21:tag_fremde_pruefungen' using errcode = 'P0001', hint = 'An diesem Tag prüfen auch Schüler anderer Fahrlehrer. Bitte das Büro fragen.';
  end if;
  return new;
end $function$;
create trigger trg_pruefungstag_schutz before insert or update on public.pruefungstage
  for each row execute function public.pruefungstag_schutz();

-- Start/Datum/Fensterzahl geändert: alle Fenster-Prüfungen des Tages neu berechnen (pt_schutz rechnet datum/von aus dem Tag).
create or replace function public.pruefungstag_nachziehen()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  if new.start is distinct from old.start or new.datum is distinct from old.datum or new.fenster_zahl is distinct from old.fenster_zahl then
    update public.pruefungstermine set aktualisiert_am = now() where pruefungstag_id = new.id;
  end if;
  return null;
end $function$;
create trigger trg_pruefungstag_nachziehen after update on public.pruefungstage
  for each row execute function public.pruefungstag_nachziehen();

-- ---------- 2. Neue Spalten an pruefungstermine ----------
alter table public.pruefungstermine
  add column pruefungstag_id uuid references public.pruefungstage(id),
  add column fenster smallint check (fenster is null or fenster between 0 and 11),
  add column fenster_anzahl smallint not null default 1 check (fenster_anzahl in (1, 2)),
  add column quelle text not null default 'buero' check (quelle in ('buero', 'app', 'app_alt')),
  -- false = Ergebnis kam aus der App (kalender_pruefungen); das Büro übernimmt es mit einem Tipp in die Akte (Datum, Reaktivierung, Aufgabe)
  add column ergebnis_uebernommen boolean not null default true,
  add column kalender_fehler text;
create index pruefungstermine_tag on public.pruefungstermine (pruefungstag_id) where pruefungstag_id is not null;
-- Zweite Sicherung neben der Sperre im Auslöser: ein Fenster-Anfang nie doppelt (auch wenn zwei gleichzeitig schreiben)
create unique index pruefungstermine_fenster_frei on public.pruefungstermine (pruefungstag_id, fenster)
  where pruefungstag_id is not null and status <> 'abgesagt';
create index pruefungstermine_schueler_datum on public.pruefungstermine (schueler_id, datum);

-- ---------- 3. Kalender-Spiegel (eigene Funktion, nach dem Lese-Ergebnis leicht anzupassen) ----------
-- Liefert '' bei Erfolg, sonst den Fehlertext. Schreibt mit Merker kompass.w21_spiegel, damit kt_pruefung_spiegel es zulässt.
create or replace function public.pt_kalender_spiegel(p public.pruefungstermine, soll boolean)
 returns text language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_lang int := case when p.fenster_anzahl = 2 or upper(coalesce(p.klasse, '')) in ('C', 'CE', 'C1', 'C1E') then 85 else 55 end;
  v_bis time;
begin
  perform set_config('kompass.w21_spiegel', '1', true);
  begin
    if soll then
      v_bis := least(p.von + make_interval(mins => v_lang), time '23:59');
      update public.kalender_termine set fahrlehrer_id = p.fahrlehrer_id, schueler_id = p.schueler_id, datum = p.datum, von = p.von, bis = v_bis,
             art = 'pruefung', geloescht = false, aktualisiert_am = now()
       where id = p.kalender_termin_id;
      if not found then
        insert into public.kalender_termine (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, von, bis, art, status, geloescht, payload, erstellt_von, aktualisiert_am)
        values (p.kalender_termin_id, p.fahrschule_id, p.fahrlehrer_id, p.schueler_id, p.datum, p.von, v_bis, 'pruefung', 'geplant', false,
                jsonb_build_object('note', case when p.quelle = 'app' then 'Praxisprüfung' else 'Praxisprüfung (vom Büro geplant)' end, 'pruefungstermin_id', p.id),
                auth.uid(), now());
      end if;
    elsif p.kalender_termin_id is not null then
      update public.kalender_termine set geloescht = true, aktualisiert_am = now() where id = p.kalender_termin_id and not coalesce(geloescht, false);
    end if;
  exception when others then
    perform set_config('kompass.w21_spiegel', '', true);
    return left(sqlerrm, 200);
  end;
  perform set_config('kompass.w21_spiegel', '', true);
  return '';
end $function$;
revoke all on function public.pt_kalender_spiegel(public.pruefungstermine, boolean) from public, anon, authenticated;

-- ---------- 4. Schutz und Berechnung an pruefungstermine ----------
create or replace function public.pt_schutz()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  t public.pruefungstage;
  v_buero boolean := auth.uid() is null or is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid());
  v_soll boolean;
  v_neu_im_kalender boolean;
  v_g text;
  v_fehler text;
begin
  if tg_op = 'UPDATE' then
    -- Alter Büro-Stand ändert Datum/Uhrzeit einer Fenster-Prüfung von Hand: wird freie Uhrzeit (kein Fehler, nichts verrutscht).
    if new.pruefungstag_id is not distinct from old.pruefungstag_id and new.fenster is not distinct from old.fenster
       and old.pruefungstag_id is not null and (new.datum is distinct from old.datum or new.von is distinct from old.von) then
      new.pruefungstag_id := null; new.fenster := null;
    end if;
    if not v_buero then
      new.entgelt_bezahlt := old.entgelt_bezahlt; new.tuev_gutschein := old.tuev_gutschein; new.as_portal := old.as_portal;
      new.notiz := old.notiz; new.quelle := old.quelle; new.fahrschule_id := old.fahrschule_id;
    end if;
  else
    if not v_buero then
      -- 'app_alt' = einmal aus der alten App-Tafel übernommen (keine „neue Prüfung“ für den Zahlungs-Hinweis im Büro)
      new.entgelt_bezahlt := false; new.tuev_gutschein := false; new.as_portal := false; new.quelle := case when new.quelle = 'app_alt' then 'app_alt' else 'app' end;
      new.ergebnis_uebernommen := true;
    end if;
  end if;
  if new.status is null then new.status := 'geplant'; end if;
  new.aktualisiert_am := now(); -- Server-Zeit (für die 15-Minuten-Frist beim Zurücknehmen einer Absage)
  -- Ergebnis neu gesetzt: vom Büro = schon in der Akte; aus der App (Fahrlehrer, auch über kalender_pruefungen) = Büro übernimmt es
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.ergebnis_uebernommen := case when new.status not in ('bestanden', 'nicht_bestanden') then true
                                     when coalesce(current_setting('kompass.w21_ergebnis', true), '') = '1' then false   -- kam aus kalender_pruefungen (App)
                                     else v_buero end;
  end if;

  -- Fenster
  if new.pruefungstag_id is null then
    new.fenster := null;
  else
    select * into t from public.pruefungstage where id = new.pruefungstag_id for update; -- App und Büro warten hier aufeinander
    if not found or t.geloescht or t.fahrschule_id is distinct from new.fahrschule_id then
      raise exception 'W21:tag_fehlt' using errcode = 'P0001', hint = 'Diesen Prüfungstag gibt es nicht (mehr).';
    end if;
    if new.fenster is null or new.fenster < 0 or new.fenster + new.fenster_anzahl > t.fenster_zahl then
      raise exception 'W21:fenster_ungueltig' using errcode = 'P0001', hint = 'Dieses Zeitfenster gibt es an dem Tag nicht.';
    end if;
    new.datum := t.datum;
    new.von := t.start + make_interval(mins => 55 * new.fenster);
    if new.status <> 'abgesagt' and exists (
         select 1 from public.pruefungstermine q
          where q.pruefungstag_id = new.pruefungstag_id and q.id <> new.id and q.status <> 'abgesagt' and q.fenster is not null
            and q.fenster < new.fenster + new.fenster_anzahl and new.fenster < q.fenster + q.fenster_anzahl) then
      raise exception 'W21:fenster_belegt' using errcode = 'P0001', hint = 'Dieses Zeitfenster ist schon belegt.';
    end if;
  end if;

  -- Ein Schüler nie zweimal am selben Tag (Praxis)
  if coalesce(new.art, 'praxis') = 'praxis' and new.status <> 'abgesagt' and new.schueler_id is not null and new.datum is not null
     and (tg_op = 'INSERT' or new.schueler_id is distinct from old.schueler_id or new.datum is distinct from old.datum
          or old.status = 'abgesagt' or old.art is distinct from new.art) then
    perform pg_advisory_xact_lock(hashtext('w21|' || new.schueler_id::text || '|' || new.datum::text));
    if exists (select 1 from public.pruefungstermine q where q.schueler_id = new.schueler_id and q.datum = new.datum and q.id <> new.id
                 and coalesce(q.art, 'praxis') = 'praxis' and q.status <> 'abgesagt') then
      raise exception 'W21:schueler_doppelt' using errcode = 'P0001', hint = 'Der Schüler hat an diesem Tag schon eine Prüfung.';
    end if;
  end if;

  -- Kalender-Spiegel (vorher Büro-Browser): Praxis mit Fahrlehrer und Uhrzeit, nicht abgesagt
  v_soll := coalesce(new.art, 'praxis') = 'praxis' and new.fahrlehrer_id is not null and new.von is not null and new.status <> 'abgesagt';
  if v_soll then
    -- Zahlungssperre wie im Büro: neue künftige Praxisprüfung im Kalender (neu, oder anderer Tag/Schüler) für gesperrte Schüler nicht
    -- Neu ist: neue Prüfung, anderer Tag/Schüler/Fahrlehrer, wieder aktiv. Ein Haken oder Ergebnis an einer alten Zeile ohne
    -- Kalender-Eintrag ist nicht neu: dann bei gesperrtem Schüler nur keinen Kalender-Eintrag anlegen, aber speichern.
    -- wie K8: Fahrlehrerwechsel ist kein neuer Termin; „Absage zurücknehmen“ innerhalb von 15 Minuten ist ein Versehen, kein neuer Termin
    v_neu_im_kalender := tg_op = 'INSERT' or new.datum is distinct from old.datum or new.schueler_id is distinct from old.schueler_id
                         or (old.status = 'abgesagt' and coalesce(old.aktualisiert_am < now() - interval '15 minutes', true));
    if auth.uid() is not null and new.datum >= (now() at time zone 'Europe/Berlin')::date
       and (v_neu_im_kalender or new.kalender_termin_id is null) then
      v_g := public.schueler_buchung_gesperrt(new.schueler_id::text);
      if v_g is not null and v_neu_im_kalender then
        raise exception 'Zahlung ausstehend: %', v_g using errcode = 'P0001', hint = 'Bitte zuerst im Büro klären.';
      elsif v_g is not null then
        v_soll := false;
      end if;
    end if;
  end if;
  if v_soll then
    if new.kalender_termin_id is null then
      new.kalender_termin_id := 'pt' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
    end if;
  end if;
  if tg_op = 'INSERT' and new.id is null then new.id := gen_random_uuid(); end if;
  v_fehler := public.pt_kalender_spiegel(new, v_soll);
  new.kalender_fehler := nullif(v_fehler, '');
  return new;
end $function$;
create trigger trg_pt_schutz before insert or update on public.pruefungstermine
  for each row execute function public.pt_schutz();

-- ---------- 5. Spiegelzeile im Kalender: nur pruefungstermine bestimmt Tag, Zeit, Personen, gelöscht ----------
create or replace function public.kt_pruefung_spiegel()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare p public.pruefungstermine;
begin
  if coalesce(current_setting('kompass.w21_spiegel', true), '') = '1' then return new; end if;
  select * into p from public.pruefungstermine where kalender_termin_id = new.id limit 1;
  if not found then return new; end if;
  new.datum := old.datum; new.von := old.von; new.fahrlehrer_id := old.fahrlehrer_id; new.schueler_id := old.schueler_id;
  new.art := old.art; new.geloescht := old.geloescht;
  return new;
end $function$;
create trigger trg_termin_a_pruefung_spiegel before update on public.kalender_termine
  for each row execute function public.kt_pruefung_spiegel();

-- ---------- 6. Ergebnis an einer Stelle ----------
-- App → Büro: Ergebnis in kalender_pruefungen setzt pruefungstermine.status (gleicher Schüler, gleicher Tag, Praxis).
create or replace function public.kp_ergebnis_spiegel()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare v_status text; v_pt uuid; v_n int;
begin
  if coalesce(current_setting('kompass.w21_ergebnis', true), '') = '1' then return null; end if;
  if new.schueler_id is null or new.datum is null then return null; end if;
  -- Schaltkompetenz B197 ist keine Prüfung (index.html istPruefung): nie die Tafel ändern
  if coalesce(new.payload->>'b197', '') not in ('', 'false') then return null; end if;
  -- Zugehörige Praxisprüfung: gleicher Tag; sonst die einzige offene des Schülers im Umkreis von 3 Tagen (Datum im App-Dialog geändert)
  select id into v_pt from public.pruefungstermine
   where schueler_id::text = new.schueler_id::text and datum = new.datum and coalesce(art, 'praxis') = 'praxis' and status <> 'abgesagt'
   order by aktualisiert_am desc nulls last limit 1;
  if v_pt is null then
    select count(*), min(id::text)::uuid into v_n, v_pt from public.pruefungstermine
     where schueler_id::text = new.schueler_id::text and datum between new.datum - 3 and new.datum + 3
       and coalesce(art, 'praxis') = 'praxis' and status = 'geplant';
    if v_n <> 1 then v_pt := null; end if;
  end if;
  -- Ergebnis gelöscht (App: Rückgängig): Tafel wieder „geplant“, wenn kein anderes Ergebnis bleibt und das Büro nicht korrigiert hat
  if coalesce(new.geloescht, false) or new.result is null then
    if tg_op = 'UPDATE' and v_pt is not null and not coalesce(old.geloescht, false) and old.result is not null
       and coalesce(new.payload->>'buero_korrektur_am', '') = ''
       and not exists (select 1 from public.kalender_pruefungen k where k.id <> new.id and k.schueler_id::text = new.schueler_id::text and k.datum = new.datum
                         and not coalesce(k.geloescht, false) and k.result is not null and coalesce(k.payload->>'b197', '') in ('', 'false')) then
      perform set_config('kompass.w21_ergebnis', '1', true);
      begin
        update public.pruefungstermine set status = 'geplant', aktualisiert_am = now() where id = v_pt and status in ('bestanden', 'nicht_bestanden');
      exception when others then null;
      end;
      perform set_config('kompass.w21_ergebnis', '', true);
    end if;
    return null;
  end if;
  v_status := case when new.result in ('pass', 'bestanden') then 'bestanden' when new.result in ('fail', 'nicht_bestanden') then 'nicht_bestanden' end;
  if v_status is null then return null; end if;
  perform set_config('kompass.w21_ergebnis', '1', true);
  begin
    -- Eigene App-Zeile ersetzt eine vom Server angelegte Büro-Ergebniszeile desselben Tages (sonst zählte die Prüfung doppelt)
    if new.id not like 'pt-%' then
      update public.kalender_pruefungen set geloescht = true, aktualisiert_am = now()
       where id like 'pt-%' and id <> new.id and schueler_id::text = new.schueler_id::text and datum = new.datum and not coalesce(geloescht, false);
    end if;
    if not (tg_op = 'UPDATE' and new.result is not distinct from old.result and new.datum is not distinct from old.datum) and v_pt is not null then
      update public.pruefungstermine set status = v_status, aktualisiert_am = now()
       where id = v_pt and status in ('geplant', 'bestanden', 'nicht_bestanden') and status <> v_status;
    end if;
  exception when others then null; -- das Ergebnis der App wird nie dadurch verhindert
  end;
  perform set_config('kompass.w21_ergebnis', '', true);
  return null;
end $function$;
create trigger trg_kp_ergebnis_spiegel after insert or update on public.kalender_pruefungen
  for each row execute function public.kp_ergebnis_spiegel();

-- Büro → App: status bestanden/nicht bestanden schreibt kalender_pruefungen (vorhandene Zeile oder 'pt-<id>').
-- Zurück auf geplant/abgesagt: nur die selbst angelegte 'pt-<id>'-Zeile wird gelöscht markiert, App-Zeilen bleiben.
create or replace function public.pt_ergebnis_spiegel()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare v_result text; v_id text;
begin
  if coalesce(current_setting('kompass.w21_ergebnis', true), '') = '1' then return null; end if;
  -- Nur Büro/Leitung/Server: Fahrlehrer schreiben ihr Ergebnis selbst nach kalender_pruefungen (sonst zwei Ergebnis-Zeilen)
  if auth.uid() is not null and not (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then return null; end if;
  if coalesce(new.art, 'praxis') <> 'praxis' or new.schueler_id is null or new.datum is null then return null; end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status and new.datum is not distinct from old.datum
     and new.fahrlehrer_id is not distinct from old.fahrlehrer_id then return null; end if;
  v_result := case new.status when 'bestanden' then 'pass' when 'nicht_bestanden' then 'fail' end;
  perform set_config('kompass.w21_ergebnis', '1', true);
  begin
    if v_result is not null then
      select id into v_id from public.kalender_pruefungen
       where schueler_id::text = new.schueler_id::text and datum = new.datum and not coalesce(geloescht, false)
       order by (id = 'pt-' || new.id::text) desc, id limit 1;
      if v_id is not null then
        update public.kalender_pruefungen set result = v_result,
               payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object('buero_korrektur_am', now()), aktualisiert_am = now()
         where id = v_id and result is distinct from v_result;
      else
        insert into public.kalender_pruefungen (id, fahrschule_id, fahrlehrer_id, schueler_id, datum, result, pruefer, geloescht, payload, aktualisiert_am)
        values ('pt-' || new.id::text, new.fahrschule_id, new.fahrlehrer_id, new.schueler_id, new.datum, v_result, new.pruefer, false,
                jsonb_build_object('quelle', 'buero', 'pruefungstermin_id', new.id), now())
        on conflict (id) do update set result = excluded.result, datum = excluded.datum, fahrlehrer_id = excluded.fahrlehrer_id, geloescht = false, aktualisiert_am = now();
      end if;
    else
      update public.kalender_pruefungen set geloescht = true, aktualisiert_am = now()
       where id = 'pt-' || new.id::text and not coalesce(geloescht, false);
    end if;
  exception when others then null; -- das Ergebnis im Büro wird nie dadurch verhindert
  end;
  perform set_config('kompass.w21_ergebnis', '', true);
  return null;
end $function$;
create trigger trg_pt_ergebnis_spiegel after insert or update on public.pruefungstermine
  for each row execute function public.pt_ergebnis_spiegel();

-- ---------- 7. Rechte für Fahrlehrer an pruefungstermine ----------
create policy "Pruefungstermine Fahrlehrer anlegen" on public.pruefungstermine as permissive for insert to authenticated
  with check (fahrlehrer_id = auth.uid() and fahrschule_id = my_fahrschule_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv)
    and exists (select 1 from public.schueler s where s.id::text = schueler_id::text and s.fahrschule_id = my_fahrschule_id()));
create policy "Pruefungstermine Fahrlehrer eigene aendern" on public.pruefungstermine as permissive for update to authenticated
  using (fahrlehrer_id = auth.uid())
  with check (fahrlehrer_id = auth.uid() and fahrschule_id = my_fahrschule_id()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv)
    and exists (select 1 from public.schueler s where s.id::text = schueler_id::text and s.fahrschule_id = my_fahrschule_id()));
revoke all on public.pruefungstermine from anon;
grant select, insert, update on public.pruefungstermine to authenticated;

-- ---------- 8. RPCs ----------
-- Zwei Prüfungen tauschen (gleicher oder anderer Tag). Rechte wie beim Ändern (RLS gilt, security invoker).
create or replace function public.pruefung_tauschen(a uuid, b uuid)
 returns void language plpgsql security invoker set search_path to 'public'
as $function$
declare pa public.pruefungstermine; pb public.pruefungstermine; n int;
begin
  if a = b then return; end if;
  -- beide Tage in fester Reihenfolge sperren (kein Verklemmen, wenn zwei gleichzeitig tauschen)
  perform 1 from public.pruefungstage where id in (select pruefungstag_id from public.pruefungstermine where id in (a, b)) order by id for update;
  select * into pa from public.pruefungstermine where id = a for update;
  select * into pb from public.pruefungstermine where id = b for update;
  if pa.id is null or pb.id is null then raise exception 'W21:nicht_gefunden' using errcode = 'P0001', hint = 'Prüfung nicht gefunden oder keine Berechtigung.'; end if;
  if pa.pruefungstag_id is null or pb.pruefungstag_id is null then raise exception 'W21:nur_fenster' using errcode = 'P0001', hint = 'Tauschen geht nur zwischen Zeitfenstern.'; end if;
  update public.pruefungstermine set pruefungstag_id = null, fenster = null, aktualisiert_am = now() where id = a;
  get diagnostics n = row_count; if n = 0 then raise exception 'W21:keine_berechtigung' using errcode = 'P0001'; end if;
  begin
    update public.pruefungstermine set pruefungstag_id = pa.pruefungstag_id, fenster = pa.fenster, aktualisiert_am = now() where id = b;
    get diagnostics n = row_count; if n = 0 then raise exception 'W21:keine_berechtigung' using errcode = 'P0001'; end if;
    update public.pruefungstermine set pruefungstag_id = pb.pruefungstag_id, fenster = pb.fenster, aktualisiert_am = now() where id = a;
  exception when others then
    -- Lkw (zwei Fenster) passt nicht an den Platz des anderen: eigene, verständliche Meldung (alles wird zurückgerollt)
    if sqlerrm like 'W21:fenster_belegt%' or sqlerrm like 'W21:fenster_ungueltig%' or sqlerrm like '%pruefungstermine_fenster_frei%' then
      raise exception 'W21:tausch_passt_nicht' using errcode = 'P0001', hint = 'Eine Lkw-Prüfung braucht zwei freie Fenster hintereinander.';
    end if;
    raise;
  end;
end $function$;
revoke all on function public.pruefung_tauschen(uuid, uuid) from public, anon;
grant execute on function public.pruefung_tauschen(uuid, uuid) to authenticated;

-- Belegung der Prüfungstage der eigenen Fahrschule: frei/belegt je Fenster. Schüler/Fahrlehrer nur bei eigenen (Büro/Leitung: alle).
-- p_fahrschule: nur der Super-Admin darf eine andere als die eigene Fahrschule wählen (Büro-Seite: Fahrschul-Auswahl)
create or replace function public.pruefungstage_belegung(p_von date, p_bis date, p_fahrschule uuid default null)
 returns jsonb language plpgsql stable security definer set search_path to 'public'
as $function$
declare v_fs uuid := case when p_fahrschule is not null and is_super_admin(auth.uid()) then p_fahrschule else my_fahrschule_id() end;
  v_alle boolean := is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid());
begin
  if auth.uid() is null or v_fs is null then return '[]'::jsonb; end if;
  if not v_alle and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.rolle = 'fahrlehrer' and p.aktiv) then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'datum', t.datum, 'start', to_char(t.start, 'HH24:MI'), 'fenster_zahl', t.fenster_zahl,
             'pruefer', t.pruefer, 'notiz', t.notiz, 'erstellt_von', t.erstellt_von, 'start_geaendert_am', t.start_geaendert_am,
             'belegt', coalesce((select jsonb_agg(jsonb_build_object('fenster', q.fenster, 'anzahl', q.fenster_anzahl, 'status', q.status,
                          'eigen', q.fahrlehrer_id = auth.uid(),
                          'id', case when v_alle or q.fahrlehrer_id = auth.uid() then q.id end,
                          'schueler_id', case when v_alle or q.fahrlehrer_id = auth.uid() then q.schueler_id end,
                          'fahrlehrer_id', case when v_alle or q.fahrlehrer_id = auth.uid() then q.fahrlehrer_id end) order by q.fenster)
                        from public.pruefungstermine q where q.pruefungstag_id = t.id and q.status <> 'abgesagt'), '[]'::jsonb))
           order by t.datum, t.start)
      from public.pruefungstage t
     where t.fahrschule_id = v_fs and not t.geloescht and t.datum between p_von and p_bis), '[]'::jsonb);
end $function$;
revoke all on function public.pruefungstage_belegung(date, date, uuid) from public, anon;
grant execute on function public.pruefungstage_belegung(date, date, uuid) to authenticated;
