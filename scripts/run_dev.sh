#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARCANUS_ROOT="$(cd "${ROOT_DIR}/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/Upgrade/cds_backend_scaffold"
FRONTEND_DIR="$ROOT_DIR"

PORT="${PORT:-3100}"
DATABASE_URL="${DATABASE_URL:-postgres://neiljones@localhost:5432/cds_dev}"

echo "Starting CDS backend (PORT=$PORT, DATABASE_URL=$DATABASE_URL)"
(
  cd "$BACKEND_DIR"
  PORT="$PORT" DATABASE_URL="$DATABASE_URL" npm run dev
) &
BACKEND_PID=$!

echo "Starting frontend (Vite)"
(
  cd "$FRONTEND_DIR"
  npm run dev
) &
FRONTEND_PID=$!

trap 'echo "Shutting down..."; kill $BACKEND_PID $FRONTEND_PID' INT TERM

wait
