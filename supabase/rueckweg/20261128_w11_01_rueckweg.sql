-- Rückweg zu 20261128_w11_01_papierkorb_frist.sql: papierkorb_leeren() wieder mit fester Frist 30 Tage (Fassung K7).
-- Gespeicherte Werte 'papierkorb.tage' bleiben in fahrschule_einstellungen stehen (schaden nicht, werden dann nicht gelesen).

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
    select t.id, t.fahrschule_id, t.datum, t.von, t.bis from public.kalender_termine t
     where t.geloescht
       and t.geloescht_am is not null
       and t.geloescht_am < now() - interval '30 days'
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
                'Papierkorb nach 30 Tagen geleert');
      end if;
      n := n + 1;
    exception when foreign_key_violation then null;
    end;
  end loop;
  return n;
end $function$;

revoke all on function public.papierkorb_leeren() from public, anon;
grant execute on function public.papierkorb_leeren() to authenticated;

-- Ergebnis (erwartet: feste_frist = true)
select position('papierkorb.tage' in pg_get_functiondef('public.papierkorb_leeren()'::regprocedure)) = 0 as feste_frist;
