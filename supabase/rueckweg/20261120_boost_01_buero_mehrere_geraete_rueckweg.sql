-- Rückweg: alte Fassung (eine Sitzung je Person und Konto)
CREATE OR REPLACE FUNCTION public.buero_neue_sitzung(p_person uuid, p_fs uuid, p_nur_pin boolean)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $function$
declare tok text;
begin
  delete from public.buero_sitzungen where laeuft_ab < now() or (user_id = auth.uid() and person_id = p_person);
  tok := encode(gen_random_bytes(32), 'hex');
  insert into public.buero_sitzungen (token_hash, person_id, fahrschule_id, user_id, nur_pin_aendern, laeuft_ab)
  values (encode(digest(tok, 'sha256'), 'hex'), p_person, p_fs, auth.uid(), p_nur_pin, now() + interval '12 hours');
  return tok;
end $function$;
