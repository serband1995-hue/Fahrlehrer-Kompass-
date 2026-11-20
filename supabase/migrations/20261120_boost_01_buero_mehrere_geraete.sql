-- 20.11.2026 (Termin Boost): Dieselbe Büro-Person darf an mehreren PCs gleichzeitig angemeldet sein.
-- Vorher löschte jede neue PIN-Anmeldung alle anderen Sitzungen derselben Person am selben Konto
-- (der erste PC flog raus). Jetzt: abgelaufene Sitzungen löschen und je Person und Konto höchstens
-- die 5 neuesten behalten. Sperren (aktiv = false) und „PIN freigeben“ beenden weiter alle Sitzungen.
CREATE OR REPLACE FUNCTION public.buero_neue_sitzung(p_person uuid, p_fs uuid, p_nur_pin boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare tok text;
begin
  delete from public.buero_sitzungen where laeuft_ab < now();
  delete from public.buero_sitzungen where token_hash in (
    select x.token_hash from (
      select s.token_hash, row_number() over (order by s.laeuft_ab desc) as nr
      from public.buero_sitzungen s where s.user_id = auth.uid() and s.person_id = p_person
    ) x where x.nr >= 5);
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.buero_sitzungen (token_hash, person_id, fahrschule_id, user_id, nur_pin_aendern, laeuft_ab)
  values (encode(digest(tok, 'sha256'), 'hex'), p_person, p_fs, auth.uid(), p_nur_pin, now() + interval '12 hours');
  return tok;
end $function$;
