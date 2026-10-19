#!/usr/bin/env bash
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATE="${LOCAL_SUPABASE_DIR:-$ROOT/.local-supabase}"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
pkill -f "local-supabase/gateway.mjs"; pkill -f "postgrest.conf"; pkill -f " serve$"
if [ "$(id -u)" = 0 ]; then su postgres -s /bin/bash -c "$PG_BIN/pg_ctl -D '$STATE/pgdata' stop"; else "$PG_BIN/pg_ctl" -D "$STATE/pgdata" stop; fi
