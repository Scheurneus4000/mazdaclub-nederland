#!/usr/bin/env sh
# Dagelijkse databaseback-up (bewaart 30 dagen). Voorbeeld-crontab:
#   15 3 * * * /opt/mazdaclub/deploy/backup.sh >> /var/log/mazdaclub-backup.log 2>&1
set -eu

cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-/opt/mazdaclub/backups}"
STAMP="$(date +%Y-%m-%d_%H%M)"
mkdir -p "$BACKUP_DIR"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' > "$BACKUP_DIR/mazdaclub_$STAMP.dump"
find "$BACKUP_DIR" -name 'mazdaclub_*.dump' -mtime +30 -delete

echo "Back-up gemaakt: $BACKUP_DIR/mazdaclub_$STAMP.dump"
# Herstellen:
#   docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < bestand.dump
