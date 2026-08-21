#!/bin/sh
set -e

echo "[AdPilot] Running database migrations..."
npx prisma db push --skip-generate

echo "[AdPilot] Starting application..."
exec npm start
