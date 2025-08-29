import os, time, requests, json, pathlib
from datetime import timezone
from influxdb_client import InfluxDBClient

# --- Konfiguration ---
INFLUX_URL   = os.getenv("INFLUX_URL")
INFLUX_TOKEN = os.getenv("INFLUX_TOKEN")
INFLUX_ORG   = os.getenv("INFLUX_ORG")
BUCKET       = os.getenv("INFLUX_BUCKET")
MEASUREMENT  = "sensor_data"

FIELDS_ENV   = "sensor_1,sensor_2,sensor_3,sensor_4"
FIELDS = []
if FIELDS_ENV:
    FIELDS = [f.strip() for f in FIELDS_ENV.split(",") if f.strip()]
else:
    # Fallback
    FIELDS = ["sensor_1"]

THRESHOLD    = float("0")
DISCORD_WEBHOOK = os.getenv("DISCORD_WEBHOOK")

INTERVAL_SEC = int("30")
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

def build_field_filter(fields):
    parts = [f'r._field == "{f}"' for f in fields]
    return " or ".join(parts)

def fetch_last_points():
    field_filter = build_field_filter(FIELDS)
    query = f'''
from(bucket: "{BUCKET}")
  |> range(start: -5m)
  |> filter(fn: (r) => r._measurement == "{MEASUREMENT}" and ({field_filter}))
  |> group(columns: ["_field"])
  |> last()
'''
    out = {}
    with InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG) as client:
        tables = client.query_api().query(query=query, org=INFLUX_ORG)
        for table in tables:
            for record in table.records:
                fld = record.get_field()
                out[fld] = {
                    "value": record.get_value(),
                    "time":  record.get_time().astimezone(timezone.utc).isoformat()
                }
    return out

def send_discord_alert(field, value, iso_time):
    content = (
        f"⚠️ Schwellenwert überschritten: {value}"
        f"in `{MEASUREMENT}.{field}`\nZeit (UTC): {iso_time}"
    )
    r = requests.post(DISCORD_WEBHOOK, json={"content": content}, timeout=10)
    r.raise_for_status()

def main():
    state = load_state()  
    while True:
        try:
            last_map = fetch_last_points()
            for field, data in last_map.items():
                v = data["value"]
                t = data["time"]
                last_reported = state.get(field)
                if v is not None and float(v) == THRESHOLD and last_reported != t:
                    send_discord_alert(field, v, t)
                    state[field] = t
                    save_state(state)
        except Exception as e:
            print("Fehler:", e)
        time.sleep(INTERVAL_SEC)

if __name__ == "__main__":
    main()
