#!/usr/bin/env bash
# Lance backend + frontend en parallèle (Linux / macOS).
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ">> Installation des dépendances backend (Poetry)…"
( cd "$ROOT/backend" && poetry install --no-root )

echo ">> Installation des dépendances frontend (npm)…"
( cd "$ROOT/frontend" && npm install )

echo ">> Démarrage du backend sur http://localhost:8000"
( cd "$ROOT/backend" && poetry run fastapi dev app/main.py --port 8000 ) &
BACK_PID=$!

echo ">> Démarrage du frontend sur http://localhost:5173"
( cd "$ROOT/frontend" && npm run dev ) &
FRONT_PID=$!

trap "echo 'Arrêt…'; kill $BACK_PID $FRONT_PID 2>/dev/null; exit 0" INT TERM

wait
