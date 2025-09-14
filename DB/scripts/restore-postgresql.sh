#!/bin/bash
LATEST_BACKUP=$(ls -t ./backups/postgresql/backup_*.sql.gz | head -n 1)
docker exec -i postgresql psql -U auditim -d postgres -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
gunzip -c "$LATEST_BACKUP" | docker exec -i postgresql psql -U auditim postgres 