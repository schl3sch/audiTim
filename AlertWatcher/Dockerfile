FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY watcher.py .

RUN mkdir -p /app/state
ENV STATE_FILE=/app/state/.last_discord_alert.json

ENV INTERVAL_SEC=30

CMD [ "python", "watcher.py" ]
 