#!/usr/bin/env bash
# Aplica as migrations e o seed no banco local (apaga o esquema public antes).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PSQL=("$PG_BIN/psql" -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" <<'SQL'
set client_min_messages = warning;
drop schema if exists public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
delete from storage.objects; delete from storage.buckets;
drop policy if exists "public_images_read" on storage.objects;
drop policy if exists "public_images_staff_insert" on storage.objects;
drop policy if exists "public_images_staff_update" on storage.objects;
drop policy if exists "public_images_staff_delete" on storage.objects;
delete from auth.users;
SQL
for f in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$ROOT/supabase/seed.sql"
if [ "${WITH_DEMO:-1}" = 1 ]; then "${PSQL[@]}" -f "$ROOT/supabase/seed-demo.sql"; fi
"${PSQL[@]}" -c "notify pgrst, 'reload schema'"
echo "Migrations aplicadas."
