import os, time, requests, json, pathlib
from datetime import datetime, timezone
from influxdb_client import InfluxDBClient

#Konfiguration
INFLUX_URL   = os.getenv("INFLUX_URL", "http://influxdb:8086")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG   = os.getenv("INFLUX_ORG")
BUCKET       = os.getenv("INFLUX_BUCKET")
MEASUREMENT  = os.getenv("WATCHER_MEASUREMENT")
FIELD        = os.getenv("WATCHER_FIELD",        "value")
THRESHOLD    = float(os.getenv("WATCHER_THRESHOLD", "50"))
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")

# alle X Sekunden prüfen
INTERVAL_SEC = int(os.getenv("INTERVAL_SEC", "30")) #werte nach Komma (hier:30) sind immer die default / fallback Werte, für Änderung muss die .env geändert werden
STATE_FILE   = os.getenv("STATE_FILE", ".last_discord_alert.json")

def load_state():
    p = pathlib.Path(STATE_FILE)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except Exception:
            return {}
    return {}

def save_state(state):
    pathlib.Path(STATE_FILE).write_text(json.dumps(state))

def fetch_last_point():
    query = f'''
from(bucket: "{BUCKET}")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}" and r._field == "{FIELD}")
  |> last()
'''
    with InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG) as client:
        tables = client.query_api().query(query=query, org=INFLUX_ORG)
        for table in tables:
            for record in table.records:
                return {
                    "value": record.get_value(),
                    "time":  record.get_time().astimezone(timezone.utc).isoformat()
                }
    return None

def send_discord_alert(value, iso_time):
    content = f"⚠️ Sensor prüfen!: {value} > {THRESHOLD} in `{MEASUREMENT}.{FIELD}`\nZeit (UTC): {iso_time}⚠️"
    
    r = requests.post(DISCORD_WEBHOOK, json={"content": content}, timeout=10)
    r.raise_for_status()

def main():
    state = load_state()  
    while True:
        try:
            last = fetch_last_point()
            if last:
                v = last["value"]
                t = last["time"]
                # nur auslösen, wenn > THRESHOLD
                if v is not None and float(v) > THRESHOLD and state.get("last_reported_iso") != t:
                    send_discord_alert(v, t)
                    state["last_reported_iso"] = t
                    save_state(state)
        except Exception as e:
            print("Fehler:", e)
        time.sleep(INTERVAL_SEC)

if __name__ == "__main__":
    main()
