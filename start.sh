#!/bin/bash
# M Customs Manager - Startup Script
# Starts both backend and frontend servers

set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCANUS_ROOT="$(cd "${APP_DIR}/.." && pwd)"
PNPM_BIN="${PNPM_BIN:-${ARCANUS_ROOT}/bin/pnpm}"
LOG_DIR="${ARCANUS_ROOT}/.logs"
BACKEND_LOG="${LOG_DIR}/arcanus-customs-backend.log"
FRONTEND_LOG="${LOG_DIR}/arcanus-customs-frontend.log"

export ARCANUS_VAULT_ROOT="${ARCANUS_VAULT_ROOT:-${ARCANUS_ROOT}/Arcanus Vault}"
export PATH="${ARCANUS_ROOT}/bin:${PATH}"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║          M Customs Manager - Starting Application          ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

if [ ! -x "${PNPM_BIN}" ]; then
    echo "ERROR: pnpm not found at ${PNPM_BIN}" >&2
    echo "Place the portable pnpm runtime at ${ARCANUS_ROOT}/bin/pnpm or set PNPM_BIN." >&2
    exit 1
fi

mkdir -p "${LOG_DIR}"

# Check if node_modules exists
if [ ! -d "${APP_DIR}/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    "${PNPM_BIN}" --dir "${APP_DIR}" install
fi

if [ ! -d "${APP_DIR}/backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    "${PNPM_BIN}" --dir "${APP_DIR}/backend" install
fi

echo ""
echo "🚀 Starting servers..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill ${BACKEND_PID:-} ${FRONTEND_PID:-} 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend in background
echo "🔧 Starting backend on http://localhost:3005..."
(
    cd "${APP_DIR}/backend"
    "${PNPM_BIN}" run dev
) > "${BACKEND_LOG}" 2>&1 &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend in background
echo "🎨 Starting frontend on http://localhost:3004..."
(
    cd "${APP_DIR}"
    "${PNPM_BIN}" run dev
) > "${FRONTEND_LOG}" 2>&1 &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 3

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║                    ✅ Servers Running!                     ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "🔧 Backend:  http://localhost:3005"
echo "🎨 Frontend: http://localhost:3004"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f ${BACKEND_LOG}"
echo "   Frontend: tail -f ${FRONTEND_LOG}"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
