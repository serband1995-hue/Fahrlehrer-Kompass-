#!/usr/bin/env bash
# W26: Kundennummer bei gleichzeitigem Anlegen (echtes Postgres, mehrere Verbindungen = mehrere Geräte).
# Startet ein Wegwerf-Postgres (braucht /usr/lib/postgresql/*/bin und den Nutzer „postgres“), spielt Einstellungen, Belege und
# W26 ein und lässt 4 „Geräte“ je 100 Schüler gleichzeitig anlegen (jeder in eigener Transaktion), dazu ein Gerät, das
# dieselben Schüler immer wieder per Upsert abgleicht (wie die App-Brücke). Erwartet: alle Nummern verschieden, lückenlos 1..N,
# Zähler = N, Upserts verbrauchen keine Nummer. Ohne Postgres: Hinweis und Ende (kein Fehler).
# Aufruf: bash scripts/kunden-parallel-test.sh
set -euo pipefail
BIN=$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1 || true)
if [ -z "$BIN" ] || { [ "$(id -u)" = 0 ] && ! id postgres >/dev/null 2>&1; }; then echo "Kein Postgres hier – Parallel-Test übersprungen."; exit 0; fi
ROOT=$(cd "$(dirname "$0")/.." && pwd)
DIR=$(mktemp -d /tmp/w26-pg.XXXXXX); chmod 755 "$DIR"; if [ "$(id -u)" = 0 ]; then chown postgres "$DIR"; fi
PORT=55432
als_pg() { if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
aufraeumen() { als_pg "$BIN/pg_ctl -D $DIR/data -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap aufraeumen EXIT
als_pg "$BIN/initdb -D $DIR/data -A trust -U postgres" >/dev/null
als_pg "$BIN/pg_ctl -D $DIR/data -o '-p $PORT -k $DIR -c listen_addresses=' -l $DIR/log -w start" >/dev/null
PSQL="env PGOPTIONS=-cclient_min_messages=warning psql -h $DIR -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -qAt"
A=11111111-1111-4111-8111-111111111111; BU=aaaaaaaa-0000-4000-8000-000000000001; FL=aaaaaaaa-0000-4000-8000-000000000002
$PSQL <<SQL
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as \$\$ select nullif(current_setting('test.uid', true), '')::uuid \$\$;
grant usage on schema auth to public;
create table public.fahrschulen (id uuid primary key, name text);
create table public.profiles (id uuid primary key, fahrschule_id uuid, rolle text, aktiv boolean default true, name text);
create table public.schueler (id text primary key, fahrschule_id uuid not null, fahrlehrer_id uuid, name text not null, telefon text,
  status text not null default 'aktiv', erstellt_am timestamptz default now(), aktualisiert_am timestamptz default now(), ausbildung jsonb default '{}'::jsonb,
  vertrag_am date, klasse text, ausbildungsart text not null default 'neu', reakt_status text not null default 'pruefen', reakt_bezahlt_bis date, reakt_notiz text,
  reakt_betrag numeric, theorie_abgeschlossen_am date, theorie_bestanden_am date, praxis_bestanden_am date, b197_testfahrt_am date, inaktiv_seit date, antrag_am date,
  bewerbernummer text, theorie_frist_bis date, sehhilfe boolean, vorbesitz text[], auslands_fs jsonb, wohnsitz_de_seit date, uebersetzung_vorhanden boolean);
create table public.aenderungsprotokoll (id bigserial, fahrschule_id uuid, tabelle text, datensatz_id text, feld text, alt text, neu text, geaendert_von uuid, bearbeiter text, grund text);
create function public.is_super_admin(u uuid) returns boolean language sql stable security definer as \$\$ select exists (select 1 from public.profiles where id = u and rolle = 'super_admin') \$\$;
create function public.is_buero(u uuid) returns boolean language sql stable security definer as \$\$ select exists (select 1 from public.profiles where id = u and rolle = 'buero') \$\$;
create function public.is_fahrschule_admin(u uuid) returns boolean language sql stable security definer as \$\$ select exists (select 1 from public.profiles where id = u and rolle = 'fahrschule_admin') \$\$;
create function public.buero_bearbeiter() returns text language sql stable as \$\$ select null::text \$\$;
create function public.k5_meine_fahrschule() returns uuid language sql stable security definer as \$\$ select fahrschule_id from public.profiles where id = auth.uid() \$\$;
create function public.zm_darf(fs uuid) returns boolean language sql stable security definer set search_path to 'public' as \$\$ select fs = k5_meine_fahrschule() \$\$;
create function public.schueler_protokoll() returns trigger language plpgsql as \$\$ begin return new; end \$\$;
alter table public.schueler enable row level security;
create policy s_all on public.schueler for all to authenticated using (fahrschule_id = k5_meine_fahrschule()) with check (fahrschule_id = k5_meine_fahrschule());
grant usage on schema public to authenticated, anon;
grant select, insert, update on public.schueler to authenticated;
grant select on public.profiles, public.fahrschulen to authenticated;
insert into public.fahrschulen values ('$A','Fahrschule Muster');
insert into public.profiles values ('$BU','$A','buero',true,'Büro Muster'),('$FL','$A','fahrlehrer',true,'Fahrlehrer Muster');
insert into public.schueler (id, fahrschule_id, name, erstellt_am) select 'alt-' || g, '$A', 'Alt Muster ' || g, now() - (g || ' days')::interval from generate_series(1, 25) g;
SQL
for f in migrations/20261125_einst_01_fahrschule_einstellungen.sql migrations/20261201_w19_02_zahlungsbelege.sql migrations/20261205_w26_01_kunden_adresse.sql; do
  $PSQL -1 -f "$ROOT/supabase/$f" >/dev/null   # wie beim Einspielen: eine Transaktion
done
geraet() { # $1 = Gerät, $2 = Nutzer
  for i in $(seq 1 100); do
    echo "begin; set local test.uid = '$2'; set local role authenticated; insert into public.schueler (id, fahrschule_id, name) values ('g$1-$i', '$A', 'Geraet$1 Muster $i'); commit;"
  done | $PSQL >/dev/null
}
brueckeGeraet() { # gleicht ständig vorhandene Schüler per Upsert ab (darf keine Nummer verbrauchen)
  for i in $(seq 1 60); do
    echo "begin; set local test.uid = '$FL'; set local role authenticated; insert into public.schueler (id, fahrschule_id, name) values ('alt-$(( (i % 25) + 1 ))', '$A', 'Alt Muster') on conflict (id) do update set name = excluded.name; commit;"
  done | $PSQL >/dev/null
}
geraet 1 "$BU" & geraet 2 "$FL" & geraet 3 "$BU" & geraet 4 "$FL" & brueckeGeraet &
wait
ERG=$($PSQL -c "select count(*), count(distinct kundennummer), min(kundennummer), max(kundennummer), (select letzte from public.kunden_zaehler), count(*) filter (where kundennummer is null) from public.schueler")
BESTAND=$($PSQL -c "select string_agg(kundennummer::text, ',' order by erstellt_am) from public.schueler where id like 'alt-%'")
echo "Ergebnis (anzahl|verschieden|min|max|zaehler|ohne): $ERG"
FEHLER=0
[ "$ERG" = "425|425|1|425|425|0" ] || { echo "ABWEICHUNG: erwartet 425|425|1|425|425|0"; FEHLER=1; }
[ "$BESTAND" = "$(seq -s, 1 25)" ] || { echo "ABWEICHUNG Bestand-Reihenfolge: $BESTAND"; FEHLER=1; }
[ $FEHLER = 0 ] && echo "Parallel-Test: alles in Ordnung (4 Geräte gleichzeitig, eindeutig und lückenlos)."
exit $FEHLER
