#!/bin/sh
set -e

echo "⏳ Running database migrations..."
node dist/config/migrate.js

echo "🚀 Starting application..."
exec node dist/index.js
