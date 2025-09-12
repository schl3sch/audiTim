#!/bin/bash

TIMESTAMP=$(date +%F_%T)
BACKUP_PATH="./backups/postgresql/backup_${TIMESTAMP}.sql.gz"
LOGFILE="./backups/postgresql/backup.log"

log() {
    echo "[$(date +'%F %T')] $1" >> "${LOGFILE}"
}

log "Start PostgreSQL Backup"

OUTPUT_BACKUP=$(docker exec postgresql pg_dump -U auditim postgres 2>&1)
EXIT_CODE_BACKUP=$?

if [ $EXIT_CODE_BACKUP -eq 0 ]; then
    OUTPUT_ZIP=$(echo "$OUTPUT_BACKUP" | gzip -6 > "${BACKUP_PATH}" 2>&1)
    EXIT_CODE_ZIP=$?
    if [ $EXIT_CODE_ZIP -eq 0 ]; then
        log "Backup successful for ${BACKUP_PATH}!"
    else
        log "Backup Failed: ${OUTPUT_ZIP}"
    fi
else
    log "Backup Failed: ${OUTPUT_BACKUP}"
fi

echo >> "${LOGFILE}"