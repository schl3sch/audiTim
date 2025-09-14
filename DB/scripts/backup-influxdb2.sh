#!/bin/bash
TIMESTAMP=$(date +%F_%T)
BACKUP_PATH="./backups/influxdb/backup_${TIMESTAMP}"
LOGFILE="./backups/influxdb/backup.log"

log() {
    echo "[$(date +'%F %T')] $1" >> "${LOGFILE}"
}

log "Start Influxdb Backup"

OUTPUT_BACKUP=$(docker exec influxdb /bin/bash -c "influx backup /tmp/influx_backup -t \$DOCKER_INFLUXDB_INIT_ADMIN_TOKEN" 2>&1)
EXIT_CODE_BACKUP=$?

if [ $EXIT_CODE_BACKUP -eq 0 ]; then
  OUTPUT_COPY=$(docker cp influxdb:/tmp/influx_backup "${BACKUP_PATH}")
  EXIT_CODE_COPY=$?
  if [ $EXIT_CODE_COPY -eq 0 ]; then
    OUTPUT_REMOVE=$(docker exec influxdb rm -rf /tmp/influx_backup)
    EXIT_CODE_REMOVE=$?
    if [ $EXIT_CODE_REMOVE -eq 0 ]; then
      log "Backup Successful for ${BACKUP_PATH}!"
    else
      log "Remove failed: ${OUTPUT_REMOVE}"
    fi
  else
    log "Copy Failed: ${OUTPUT_COPY}"
  fi
else
    log "Backup Failed: ${OUTPUT_BACKUP}"
fi 
   
echo >> "${LOGFILE}"