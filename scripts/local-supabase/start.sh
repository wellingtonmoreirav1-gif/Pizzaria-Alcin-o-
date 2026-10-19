#!/usr/bin/env bash
# Sobe um ambiente local que imita o Supabase (PostgreSQL + Auth + REST)
# para executar os testes de integração e ponta a ponta.
# Requisitos: PostgreSQL 15+ instalado, binários do PostgREST e do Supabase Auth
# (veja docs/TESTES.md). Não é necessário para usar o Supabase na nuvem.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${LOCAL_SUPABASE_DIR:-$ROOT/.local-supabase}"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
POSTGREST_BIN="${POSTGREST_BIN:-/opt/svc/postgrest}"
GOTRUE_BIN="${GOTRUE_BIN:-/opt/svc/auth/auth}"
GOTRUE_MIGRATIONS="${GOTRUE_MIGRATIONS:-$(dirname "$GOTRUE_BIN")/migrations}"
PG_PORT=54322
export LOCAL_JWT_SECRET="${LOCAL_JWT_SECRET:-local-dev-jwt-secret-with-at-least-32-characters}"
RUN_AS="postgres"

mkdir -p "$STATE"
chown "$RUN_AS" "$STATE" 2>/dev/null || true

as_pg() { if [ "$(id -u)" = 0 ]; then su "$RUN_AS" -s /bin/bash -c "$*"; else bash -c "$*"; fi; }
psql_admin() { "$PG_BIN/psql" -h 127.0.0.1 -p $PG_PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q "$@"; }

if [ ! -d "$STATE/pgdata" ]; then
  as_pg "$PG_BIN/initdb -D '$STATE/pgdata' -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null"
fi
if ! as_pg "$PG_BIN/pg_ctl -D '$STATE/pgdata' status" >/dev/null 2>&1; then
  as_pg "$PG_BIN/pg_ctl -D '$STATE/pgdata' -l '$STATE/postgres.log' -o '-p $PG_PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp' -w start" >/dev/null
fi

FRESH=0
if ! psql_admin -tAc "select 1 from pg_roles where rolname='authenticator'" | grep -q 1; then
  psql_admin -f "$(dirname "$0")/bootstrap.sql"
  FRESH=1
fi

DB_URL_AUTH="postgres://supabase_auth_admin:auth-admin-local@127.0.0.1:$PG_PORT/postgres?sslmode=disable"

pkill -f "$GOTRUE_BIN" 2>/dev/null || true
pkill -f "$POSTGREST_BIN" 2>/dev/null || true
pkill -f "local-supabase/gateway.mjs" 2>/dev/null || true

# Supabase Auth (GoTrue): aplica suas próprias migrations e sobe na porta 54324.
export GOTRUE_DB_DRIVER=postgres
export DATABASE_URL="$DB_URL_AUTH"
export GOTRUE_DB_MIGRATIONS_PATH="$GOTRUE_MIGRATIONS"
export GOTRUE_JWT_SECRET="$LOCAL_JWT_SECRET"
export GOTRUE_JWT_EXP=3600
export GOTRUE_JWT_AUD=authenticated
export GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
export GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_SITE_URL="${SITE_URL:-http://localhost:3000}"
export GOTRUE_URI_ALLOW_LIST="http://localhost:3000/**,http://127.0.0.1:3000/**"
export API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
export GOTRUE_API_HOST=127.0.0.1
export PORT=54324
export GOTRUE_DISABLE_SIGNUP=false
export GOTRUE_EXTERNAL_EMAIL_ENABLED=true
export GOTRUE_MAILER_AUTOCONFIRM=true
export GOTRUE_RATE_LIMIT_EMAIL_SENT=1000
export GOTRUE_LOG_LEVEL=warn
"$GOTRUE_BIN" migrate >"$STATE/auth-migrate.log" 2>&1
nohup "$GOTRUE_BIN" serve >"$STATE/auth.log" 2>&1 &

if [ "$FRESH" = 1 ] || [ "${RESET_DB:-0}" = 1 ]; then
  bash "$(dirname "$0")/apply-migrations.sh"
fi

# PostgREST na porta 54323.
cat >"$STATE/postgrest.conf" <<CONF
db-uri = "postgres://authenticator:authenticator-local@127.0.0.1:$PG_PORT/postgres"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$LOCAL_JWT_SECRET"
server-host = "127.0.0.1"
server-port = 54323
db-pool = 10
CONF
nohup "$POSTGREST_BIN" "$STATE/postgrest.conf" >"$STATE/postgrest.log" 2>&1 &
nohup node "$(dirname "$0")/gateway.mjs" >"$STATE/gateway.log" 2>&1 &

for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:54321/auth/v1/health >/dev/null 2>&1 && curl -fsS http://127.0.0.1:54321/rest/v1/ -H "apikey: x" -o /dev/null 2>&1; then break; fi
  sleep 1
done
echo "Supabase local pronto em http://127.0.0.1:54321 (Postgres em 127.0.0.1:$PG_PORT)"
