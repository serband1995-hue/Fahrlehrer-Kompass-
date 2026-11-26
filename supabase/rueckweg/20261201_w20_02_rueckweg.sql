-- Rückweg zu supabase/migrations/20261201_w20_02_buero_mehrere_pcs.sql
-- Stellt buero_neue_sitzung und buero_pin_aendern wörtlich auf den Live-Stand vom 26.11.2026 (w20-1-lesen 1f) zurück:
-- wieder nur EINE Sitzung je Person und Anmeldekonto. Entfernt den Aufräum-Auftrag und den Index.
-- Das Entziehen von EXECUTE auf buero_neue_sitzung bleibt absichtlich bestehen (Sicherheitslücke, siehe Migration).
create or replace function public.buero_neue_sitzung(p_person uuid, p_fs uuid, p_nur_pin boolean)
 returns text
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare tok text;
begin
  delete from public.buero_sitzungen where laeuft_ab < now() or (user_id = auth.uid() and person_id = p_person);
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.buero_sitzungen (token_hash, person_id, fahrschule_id, user_id, nur_pin_aendern, laeuft_ab)
  values (encode(digest(tok, 'sha256'), 'hex'), p_person, p_fs, auth.uid(), p_nur_pin, now() + interval '12 hours');
  return tok;
end $function$;

create or replace function public.buero_pin_aendern(p_neu text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare s public.buero_sitzungen; p public.buero_personen;
begin
  s := public.buero_sitzung_zeile(true);
  if s.person_id is null then return jsonb_build_object('fehler', 'keine_sitzung'); end if;
  if coalesce(p_neu, '') !~ '^[0-9]{4}$' then return jsonb_build_object('fehler', 'format'); end if;
  if public.buero_pin_zu_einfach(p_neu) then return jsonb_build_object('fehler', 'zu_einfach'); end if;
  select * into p from public.buero_personen where id = s.person_id for update;
  if p.pin_hash is not null and crypt(p_neu, p.pin_hash) = p.pin_hash then return jsonb_build_object('fehler', 'gleich'); end if;
  update public.buero_personen set pin_hash = crypt(p_neu, gen_salt('bf', 8)), hat_pin = true, pin_neu_noetig = false,
    fehlversuche = 0, gesperrt_bis = null, aktualisiert_am = now() where id = p.id;
  update public.buero_sitzungen set nur_pin_aendern = false where token_hash = s.token_hash;
  perform public.buero_protokoll_person(p.fahrschule_id, p.id, 'pin', 'eigene PIN geändert von ' || p.name);
  return jsonb_build_object('ok', true);
end $function$;

do $w20br$
begin
  if to_regnamespace('cron') is not null and exists (select 1 from cron.job where jobname = 'buero_sitzungen_aufraeumen') then
    perform cron.unschedule('buero_sitzungen_aufraeumen');
  end if;
end $w20br$;

drop index if exists public.buero_sitzungen_person_zeit;
