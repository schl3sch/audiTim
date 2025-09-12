#!/bin/bash
LATEST_BACKUP=$(ls -td ./backups/influxdb/backup_* | head -n 1)
docker cp "${LATEST_BACKUP}" influxdb:/tmp/influx_backup && \
docker exec influxdb influx restore /tmp/influx_backup --full && \
docker exec influxdb rm -rf /tmp/influx_backup