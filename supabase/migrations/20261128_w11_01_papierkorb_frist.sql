-- W11 Schritt 3 (25.11.2026): Papierkorb-Frist je Fahrschule einstellbar (Einstellungen › Fahrstunden & Kalender).
-- Schlüssel 'papierkorb.tage' in fahrschule_einstellungen, wert {"tage": N}, ganze Zahl 7–90, sonst/ohne Zeile 30 (wie bisher).
-- Ändert nur papierkorb_leeren(): Frist je Zeile über fahrschule_einstellung_zahl (20261125_einst_01). Alles andere wie K7
-- (Storno/unterschrieben nie, höchstens 5000 je Lauf, Büro-Aufruf nur eigene Fahrschule, Zeitplan 03:17 unverändert).
-- Idempotent. Rückweg: supabase/rueckweg/20261128_w11_01_rueckweg.sql (stellt die feste 30-Tage-Fassung wieder her).
-- Voraussetzung: 20261123_k7_01_papierkorb.sql, 20261125_einst_01_fahrschule_einstellungen.sql.
do $$ begin
  if to_regprocedure('public.fahrschule_einstellung_zahl(uuid,text,text,int,int,int)') is null then
    raise exception 'Zuerst 20261125_einst_01_fahrschule_einstellungen.sql einspielen (fahrschule_einstellung_zahl fehlt).';
  end if;
end $$;

create or replace function public.papierkorb_leeren()
 returns integer
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  fs uuid;
  n integer := 0;
  r record;
begin
  if auth.uid() is not null then
    -- Aufruf aus der Büro-Seite: nur die eigene Fahrschule, nur Büro/Leitung/Super-Admin
    if not (is_buero(auth.uid()) or is_fahrschule_admin(auth.uid()) or is_super_admin(auth.uid())) then return 0; end if;
    fs := my_fahrschule_id();
    if fs is null then return 0; end if; -- ohne eigene Fahrschule (z. B. Super-Admin) leert nur der tägliche Zeitplan alle

  end if;
  -- Je Stunde einzeln: hängt noch etwas an einer Stunde (Fremdschlüssel), bleibt sie liegen, der Rest wird trotzdem leer
  for r in
    select t.id, t.fahrschule_id, t.datum, t.von, t.bis, f.tage from public.kalender_termine t
     cross join lateral (select public.fahrschule_einstellung_zahl(t.fahrschule_id, 'papierkorb.tage', 'tage', 30, 7, 90) as tage) f
     where t.geloescht
       and t.geloescht_am is not null
       and t.geloescht_am < now() - interval '7 days'   -- kürzeste erlaubte Frist (Index), genaue Frist je Fahrschule:
       and t.geloescht_am < now() - make_interval(days => f.tage)
       and jsonb_typeof(t.payload->'storno') is distinct from 'object'
       and coalesce(t.payload->>'signed', '') <> 'true'
       and jsonb_typeof(t.payload->'signaturUngueltig') is distinct from 'object'
       and (fs is null or t.fahrschule_id = fs)
     limit 5000
  loop
    begin
      delete from public.kalender_termine where id = r.id;
      if r.fahrschule_id is not null then
        insert into public.aenderungsprotokoll (fahrschule_id, tabelle, datensatz_id, feld, alt, neu, geaendert_von, bearbeiter, grund)
        values (r.fahrschule_id, 'kalender_termine', r.id, 'endgueltig_geloescht',
                coalesce(r.datum::text, '') || ' ' || coalesce(r.von, '') || '–' || coalesce(r.bis, ''), null, auth.uid(), null,
                'Papierkorb nach ' || r.tage || ' Tagen geleert');
      end if;
      n := n + 1;
    exception when foreign_key_violation then null;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.papierkorb_leeren() from public, anon;
grant execute on function public.papierkorb_leeren() to authenticated;

-- Ergebnis (erwartet: funktion_neu = true, frist_std = 30, rpc_offen_einst = false, anon_leert = false)
select position('papierkorb.tage' in pg_get_functiondef('public.papierkorb_leeren()'::regprocedure)) > 0 as funktion_neu,
       public.fahrschule_einstellung_zahl(null, 'papierkorb.tage', 'tage', 30, 7, 90) as frist_std,
       has_function_privilege('authenticated', 'public.fahrschule_einstellung_zahl(uuid,text,text,int,int,int)', 'execute') as rpc_offen_einst,
       has_function_privilege('anon', 'public.papierkorb_leeren()', 'execute') as anon_leert;
