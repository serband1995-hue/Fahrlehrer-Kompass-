-- W26: nach dem Einspielen von supabase/migrations/20261205_w26_01_kunden_adresse.sql (nur lesen, ändert nichts).
-- Erwartet: je Fahrschule anzahl = verschieden = max_nr = zaehler, ohne_nummer = 0; reihenfolge_ok = true
--           (Nummer steigt mit erstellt_am); trigger = 1; beleg_spalten = 3; adressen = 0 direkt nach dem Einspielen.
select s.fahrschule_id,
       count(*) as anzahl,
       count(distinct s.kundennummer) as verschieden,
       max(s.kundennummer) as max_nr,
       (select z.letzte from public.kunden_zaehler z where z.fahrschule_id = s.fahrschule_id) as zaehler,
       count(*) filter (where s.kundennummer is null) as ohne_nummer,
       bool_and(s.kundennummer = x.erwartet) as reihenfolge_ok,
       count(*) filter (where s.strasse is not null or s.plz is not null or s.ort is not null) as adressen
  from public.schueler s
  join (select id, row_number() over (partition by fahrschule_id order by erstellt_am nulls last, id) as erwartet from public.schueler) x on x.id = s.id
 group by s.fahrschule_id;
select (select count(*) from pg_trigger where tgrelid = 'public.schueler'::regclass and tgname = 'trg_schueler_kunde_vor') as trigger,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'zahlungsbelege'
          and column_name in ('kundennummer','schueler_adresse','aussteller')) as beleg_spalten,
       (select relrowsecurity from pg_class where oid = 'public.kunden_zaehler'::regclass) as rls_zaehler;
