#!/bin/sh
set -e

echo "[AdPilot] Running database migrations..."
npx prisma db push --schema /app/_schema/schema.prisma --skip-generate

echo "[AdPilot] Starting application..."
exec npm start
