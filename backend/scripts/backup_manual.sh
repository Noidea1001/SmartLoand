#!/bin/sh
# One-off manual backup (the `backup` service in docker-compose.yml already
# does this automatically once a day). Run from the project root:
#   ./backend/scripts/backup_manual.sh
set -e
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
docker compose exec -T db pg_dump -U smartloan -d smartloan | gzip > "backups/smartloan_manual_${TIMESTAMP}.sql.gz"
echo "Wrote backups/smartloan_manual_${TIMESTAMP}.sql.gz"
