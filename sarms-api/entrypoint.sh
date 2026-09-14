#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting SARMS API..."
exec node dist/main
