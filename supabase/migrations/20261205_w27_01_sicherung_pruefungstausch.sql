-- W27 Gesamtprüfung (27.11.2026): „Alles auf diesen Stand setzen“ (komplett) scheiterte, wenn seit der Sicherung zwei
-- Fenster-Prüfungen getauscht oder in einer Kette verschoben wurden: der Sammel-UPDATE stößt auf den Unique-Index
-- pruefungstermine_fenster_frei (W21, nicht aufschiebbar). Die Vorschau sagte „geht“, das Zurückholen brach ab (nichts geändert).
-- Änderung: nur der Zusatzblock vor „b) Einfügen und Ändern“; sonst identisch mit 20261204_w24_01.
-- NICHT von einer Werkstatt-Sitzung einspielen: nur die Hauptsitzung, nach Abnahme durch Fable (R558).
-- Rückweg: Funktion aus 20261204_w24_01_sicherung_vollstaendig.sql (Abschnitt 5) erneut ausführen.

create or replace function public.fahrschule_backup_wiederherstellen(backup_id uuid, modus text, tabellen text[], bestaetigung text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_fs uuid;
  v_daten jsonb;
  v_vor jsonb;
  v_nach jsonb;
  v_vorher_id uuid;
  t record;
  v_info jsonb;
  v_rows jsonb;
  v_pk text[]; v_cols text[]; v_set text[];
  v_on text; v_scope text;
  v_n bigint;
  v_ergebnis jsonb := '[]'::jsonb;
  v_schreib text[] := '{}';
  v_ein bigint; v_aend bigint; v_loe bigint;
  v_geloescht jsonb := '{}'::jsonb;
  v_trig jsonb;
  v_fk jsonb;
begin
  select fahrschule_id into v_fs from public.fahrschule_backups where id = backup_id;
  if v_fs is null or not public.w24_darf(v_fs, 'wiederherstellen') then
    raise exception 'Keine Berechtigung zum Wiederherstellen (nur Leitung der eigenen Fahrschule)' using errcode = '42501';
  end if;
  if coalesce(btrim(bestaetigung), '') = '' then raise exception 'W24: Bestätigung fehlt – erst die Vorschau ansehen'; end if;

  -- Nur eine Wiederherstellung je Fahrschule gleichzeitig; Tabellen gegen gleichzeitiges Schreiben sperren (Lesen geht weiter).
  perform pg_advisory_xact_lock(hashtext('w24-wiederherstellen'), hashtext(v_fs::text));
  set local lock_timeout = '15s';
  for t in select * from public.w24_tabellen() where art in ('voll', 'anhaengen', 'zaehler', 'auf_wunsch') and not entdeckt order by reihe loop
    execute format('lock table public.%I in share row exclusive mode', t.tabelle);
  end loop;

  v_vor := public.w24_vorschau(backup_id, modus, tabellen);
  if not coalesce((v_vor ->> 'wiederherstellbar')::boolean, false) then
    raise exception 'W24: Diese Sicherung kann nicht zurückgeschrieben werden (%).', coalesce(v_vor ->> 'grund', '?');
  end if;
  if upper(btrim(bestaetigung)) <> (v_vor ->> 'code') then
    raise exception 'W24: Der Stand hat sich seit der Vorschau geändert. Bitte die Vorschau neu öffnen.';
  end if;
  if (v_vor ->> 'einfuegen')::bigint + (v_vor ->> 'aendern')::bigint + (v_vor ->> 'loeschen')::bigint = 0 then
    return jsonb_build_object('ok', true, 'nichts_zu_tun', true, 'vorschau', v_vor);
  end if;

  v_daten := public.w24_backup_inhalt(backup_id);   -- {tabellen (offen + geschützt), pruefsumme_ok}
  -- Zuerst den jetzigen Stand sichern.
  v_vorher_id := public.w24_sichern(v_fs, 'vor_wiederherstellung', auth.uid(),
                   jsonb_build_object('fuer_backup', backup_id, 'modus', modus, 'auswahl', to_jsonb(tabellen)));

  begin
  for v_info in select x from jsonb_array_elements(v_vor -> 'tabellen') x loop
    if (v_info ->> 'einfuegen')::bigint + (v_info ->> 'aendern')::bigint + (v_info ->> 'loeschen')::bigint > 0 then
      v_schreib := v_schreib || (v_info ->> 'tabelle');
    end if;
  end loop;
  -- Betroffene Tabellen: nur die Auslöser aus, die gerade AN sind (Zustand merken; nur in dieser Transaktion).
  select coalesce(jsonb_agg(jsonb_build_array(c.relname, tg.tgname)), '[]') into v_trig
    from pg_trigger tg join pg_class c on c.oid = tg.tgrelid join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = any(v_schreib) and not tg.tgisinternal and tg.tgenabled = 'O';
  for v_info in select x from jsonb_array_elements(v_trig) x loop
    execute format('alter table public.%I disable trigger %I', v_info ->> 0, v_info ->> 1);
  end loop;
  -- Fremdschlüssel zwischen den beschriebenen Tabellen erst am Ende prüfen (Reihenfolge Löschen/Ändern egal, z. B. neues
  -- Paket löschen, bevor der Schüler wieder auf das alte zeigt). Nur „ohne Regel“/Kaskade, nie RESTRICT (nicht aufschiebbar).
  select coalesce(jsonb_agg(jsonb_build_array(k.relname, c.conname)), '[]') into v_fk
    from pg_constraint c join pg_class k on k.oid = c.conrelid join pg_class e on e.oid = c.confrelid join pg_namespace n on n.oid = k.relnamespace
   where c.contype = 'f' and not c.condeferrable and n.nspname = 'public' and c.confdeltype <> 'r' and c.confupdtype <> 'r'
     and k.relname = any(v_schreib) and e.relname = any(v_schreib);
  for v_info in select x from jsonb_array_elements(v_fk) x loop
    execute format('alter table public.%I alter constraint %I deferrable initially deferred', v_info ->> 0, v_info ->> 1);
  end loop;

  -- a) Löschen (nur komplett, Art voll), rückwärts.
  for t in select * from public.w24_tabellen() where tabelle = any(v_schreib) order by reihe desc loop
    select x into v_info from jsonb_array_elements(v_vor -> 'tabellen') x where x ->> 'tabelle' = t.tabelle;
    if t.art = 'voll' and (v_info ->> 'loeschen')::bigint > 0 then
      v_pk := array(select jsonb_array_elements_text(v_info -> 'schluessel'));
      select string_agg(format('z.%I = b.%I', c, c), ' and ') into v_on from unnest(v_pk) c;
      execute format('delete from public.%I z where %s and not %s and not exists (select 1 from jsonb_populate_recordset(null::public.%I, $2) b where %s)',
                     t.tabelle, public.w24_bereich_sql(t.bereich, t.spalte, 'z'), public.w24_fest_sql(t.tabelle, 'z'), t.tabelle, v_on)
        using v_fs, v_daten -> 'tabellen' -> t.tabelle;
      get diagnostics v_loe = row_count;
      v_geloescht := v_geloescht || jsonb_build_object(t.tabelle, v_loe);
    end if;
  end loop;

  -- W27 (Gesamtprüfung, W24 × W21): Fenster-Prüfungen, die seit der Sicherung getauscht oder verschoben wurden, kurz aus dem
  -- nicht aufschiebbaren Index pruefungstermine_fenster_frei nehmen (wie pruefung_tauschen); Schritt b) setzt sie auf den alten Platz.
  if modus = 'komplett' and 'pruefungstermine' = any(v_schreib) then
    update public.pruefungstermine z set pruefungstag_id = null, fenster = null
      from jsonb_populate_recordset(null::public.pruefungstermine, v_daten -> 'tabellen' -> 'pruefungstermine') b
     where z.id = b.id and z.fahrschule_id = v_fs and z.pruefungstag_id is not null
       and (z.pruefungstag_id is distinct from b.pruefungstag_id or z.fenster is distinct from b.fenster);
  end if;

  -- b) Einfügen und Ändern, vorwärts.
  for t in select * from public.w24_tabellen() where tabelle = any(v_schreib) order by reihe loop
    select x into v_info from jsonb_array_elements(v_vor -> 'tabellen') x where x ->> 'tabelle' = t.tabelle;
    v_rows := v_daten -> 'tabellen' -> t.tabelle;
    v_pk := array(select jsonb_array_elements_text(v_info -> 'schluessel'));
    v_cols := array(select jsonb_array_elements_text(v_info -> 'spalten'));
    select string_agg(format('z.%I = b.%I', c, c), ' and ') into v_on from unnest(v_pk) c;
    v_scope := public.w24_bereich_sql(t.bereich, t.spalte, 'z');
    v_ein := 0; v_aend := 0;
    if (v_info ->> 'einfuegen')::bigint > 0 then
      execute format('insert into public.%1$I (%2$s) overriding system value select %3$s from jsonb_populate_recordset(null::public.%1$I, $2) b where not exists (select 1 from public.%1$I z where %4$s)',
                     t.tabelle,
                     (select string_agg(format('%I', c), ', ') from unnest(v_cols) c),
                     (select string_agg(format('b.%I', c), ', ') from unnest(v_cols) c),
                     v_on)
        using v_fs, v_rows;
      get diagnostics v_ein = row_count;
    end if;
    if (v_info ->> 'aendern')::bigint > 0 then
      if t.art = 'zaehler' then
        execute format('update public.%1$I z set letzte = b.letzte from jsonb_populate_recordset(null::public.%1$I, $2) b where %2$s and %3$s and b.letzte > z.letzte',
                       t.tabelle, v_on, v_scope) using v_fs, v_rows;
        get diagnostics v_aend = row_count;
      else
        v_set := array(select c from unnest(v_cols) c where c <> all (v_pk));
        if array_length(v_set, 1) > 0 then
          execute format('update public.%1$I z set (%2$s) = row(%3$s) from jsonb_populate_recordset(null::public.%1$I, $2) b where %4$s and %5$s and not %6$s and public.w24_teil(to_jsonb(z), $3) is distinct from public.w24_teil(to_jsonb(b), $3)',
                         t.tabelle,
                         (select string_agg(format('%I', c), ', ') from unnest(v_set) c),
                         (select string_agg(format('b.%I', c), ', ') from unnest(v_set) c),
                         v_on, v_scope, public.w24_fest_sql(t.tabelle, 'z'))
            using v_fs, v_rows, v_cols;
          get diagnostics v_aend = row_count;
        end if;
      end if;
    end if;
    v_ergebnis := v_ergebnis || jsonb_build_object('tabelle', t.tabelle, 'eingefuegt', v_ein, 'geaendert', v_aend,
                                                   'geloescht', coalesce((v_geloescht ->> t.tabelle)::bigint, 0));
  end loop;

  -- Beleg-Zähler nie unter die höchste vergebene Nummer.
  if to_regclass('public.beleg_zaehler') is not null and to_regclass('public.zahlungsbelege') is not null then
    update public.beleg_zaehler z set letzte = m.n
      from (select max(nummer) n from public.zahlungsbelege where fahrschule_id = v_fs) m
     where z.fahrschule_id = v_fs and m.n is not null and m.n > z.letzte;
  end if;
  -- Zurückgeschriebene Handy-Stände bekommen eine neue Server-Zeit (sonst merken die Geräte die Änderung nicht).
  if 'snapshots' = any(v_schreib) and exists (select 1 from pg_attribute where attrelid = 'public.snapshots'::regclass and attname = 'updated_at' and not attisdropped) then
    update public.snapshots z set updated_at = now() where z.user_id in (select p.id from public.profiles p where p.fahrschule_id = v_fs)
       and exists (select 1 from jsonb_array_elements(v_daten -> 'tabellen' -> 'snapshots') s where (s ->> 'user_id')::uuid = z.user_id);
  end if;

  -- Fremdschlüssel jetzt prüfen und wieder wie vorher; Auslöser wieder an (genau die vorher aktiven).
  set constraints all immediate;
  for v_info in select x from jsonb_array_elements(v_fk) x loop
    execute format('alter table public.%I alter constraint %I not deferrable', v_info ->> 0, v_info ->> 1);
  end loop;
  for v_info in select x from jsonb_array_elements(v_trig) x loop
    execute format('alter table public.%I enable trigger %I', v_info ->> 0, v_info ->> 1);
  end loop;

  -- Nachprüfung: danach darf es nichts mehr zu tun geben (sonst alles zurück).
  v_nach := public.w24_vorschau(backup_id, modus, tabellen);
  if (v_nach ->> 'einfuegen')::bigint + (v_nach ->> 'aendern')::bigint + (v_nach ->> 'loeschen')::bigint
     - coalesce((select sum((x ->> 'aendern')::bigint) from jsonb_array_elements(v_nach -> 'tabellen') x where x ->> 'art' = 'auf_wunsch'), 0) <> 0 then
    raise exception 'W24: Nachprüfung fehlgeschlagen, nichts geändert: %', v_nach;
  end if;

  exception
    when foreign_key_violation then
      -- z. B. ein Termin eines Fahrlehrers, dessen Zugang endgültig gelöscht ist: melden, nichts still überspringen
      raise exception 'W24: Zurückholen nicht möglich, ein Eintrag verweist auf etwas, das es nicht mehr gibt (%). Es wurde nichts geändert.', sqlerrm
        using errcode = '23503';
    when unique_violation then
      -- z. B. ein Handy-Stand wurde nach der Sicherung neu angelegt (gleiches Konto, neue ID)
      raise exception 'W24: Zurückholen nicht möglich, ein Eintrag gibt es schon in anderer Form (%). Es wurde nichts geändert.', sqlerrm
        using errcode = '23505';
  end;

  update public.fahrschule_backups set hinweis = coalesce(hinweis, '{}'::jsonb) || jsonb_build_object('ergebnis', v_ergebnis, 'fertig_am', now())
   where id = v_vorher_id;
  return jsonb_build_object('ok', true, 'vorher_backup_id', v_vorher_id, 'tabellen', v_ergebnis,
                            'einfuegen', v_vor -> 'einfuegen', 'aendern', v_vor -> 'aendern', 'loeschen', v_vor -> 'loeschen');
end;
$function$;
