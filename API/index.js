require('dotenv').config();
const fs = require('fs');
const express = require('express');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const app = express();
const PORT = 3000;

app.use(express.json());

const cors = require('cors');
app.use(cors());

// InfluxDB connection setup
const influx = new InfluxDB({
  url: process.env.INFLUX_URL,
  token: process.env.INFLUX_TOKEN,
});
const org = process.env.INFLUX_ORG;
const bucket = process.env.INFLUX_BUCKET;
const queryApi = influx.getQueryApi(org);
const writeApi = influx.getWriteApi(org, bucket, 'ns');

// Connection test
queryApi.queryRows(`buckets()`, {
  next(row, tableMeta) {
    const o = tableMeta.toObject(row);
    console.log('✅ Connection successful - Bucket:', o.name);
  },
  error(error) {
    console.error('❌ Connection to InfluxDB failed:', error);
  },
  complete() {
    console.log('✅ Connection test completed.');
  },
});

// Read all sensor values
app.get('/api/allsensors', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> group(columns: ["_field"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:10)
  `;

  const result = {};

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);

      // _field enthält bei dir den Sensor-Namen
      const sensor = row._field ?? "unknown";  

      // _value enthält den eigentlichen Messwert
      const value = Number(row._value);  
      const time = row._time;

      if (!result[sensor]) result[sensor] = [];
      result[sensor].push({ time, value });
    }
    res.json(result);
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).send('Query failed');
  }
});

// Read latest sensor values (5 per sensor)
app.get('/api/newsensors', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> group(columns: ["_field"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:5)
  `;

  const result = {};

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);

      // _field enthält bei dir den Sensor-Namen
      const sensor = row._field ?? "unknown";  

      // _value enthält den eigentlichen Messwert
      const value = Number(row._value);  
      const time = row._time;

      if (!result[sensor]) result[sensor] = [];
      result[sensor].push({ time, value });
    }
    res.json(result);
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).send('Query failed');
  }
});

//  Ältester & neuster Timestamp pro Sensor
app.get('/api/sensorRange', async (req, res) => {
  const fluxQueryOldest = `
    from(bucket: "${bucket}")
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> sort(columns: ["_time"], desc: false)
      |> limit(n:1)
  `;

  const fluxQueryNewest = `
    from(bucket: "${bucket}")
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:1)
  `;

  try {
    let oldest, newest;

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQueryOldest)) {
      const row = tableMeta.toObject(values);
      oldest = row._time;
    }

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQueryNewest)) {
      const row = tableMeta.toObject(values);
      newest = row._time;
    }

    res.json({ oldest, newest });
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).json({ error: 'Error querying InfluxDB' });
  }
});

// Werte für Zeitraum abfragen
app.post('/api/sensorRange', async (req, res) => {
  const { start, stop } = req.body;
  if (!start || !stop) return res.status(400).json({ error: "Bitte start und stop im Body als Timestamps angeben" });

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> group(columns: ["_field"])
      |> sort(columns: ["_time"], desc: true)
  `;

  const result = {};

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sensor = row._field ?? "unknown";
      const value = Number(row._value);
      const time = row._time;

      if (!result[sensor]) result[sensor] = [];
      result[sensor].push({ time, value });
    }

    res.json({ data: result });
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).json({ error: 'Error querying InfluxDB' });
  }
});

// Neuestes Heatmap-Array abfragen (GET)
app.get("/api/getArray", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d) // oder -inf, falls du ALLE Zeiten willst
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `;

  try {
    let latest = null;

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));

      const grid = [];
      for (let i = 0; i < 10; i++) {
        grid.push(arr.slice(i * 10, (i + 1) * 10));
      }

      latest = {
        time: obj._time,
        grid
      };
    }

    if (!latest) {
      return res.status(404).json({ error: "Kein Array gefunden" });
    }

    res.json({ data: latest });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Ältester & Neuster Timestamp abrufen
app.get("/api/getHeatmapRange", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: 0) 
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> keep(columns: ["_time"])
      |> sort(columns: ["_time"], desc: false)
      |> limit(n:1)
  `;

  const fluxQueryNewest = `
    from(bucket: "${bucket}")
      |> range(start: 0) 
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> keep(columns: ["_time"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:1)
  `;

  try {
    let oldest, newest;

    // Ältester
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      oldest = tableMeta.toObject(values)._time;
    }

    // Neuster
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQueryNewest)) {
      newest = tableMeta.toObject(values)._time;
    }

    res.json({ oldest, newest });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Heatmaps im Zeitraum abfragen (POST)
app.post("/api/postHeatmapsRange", async (req, res) => {
  const { start, stop } = req.body;

  if (!start || !stop) {
    return res.status(400).json({ error: "Bitte start und stop im Body als Timestamps angeben" });
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> sort(columns: ["_time"], desc: true)
  `;

  const result = [];

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));

      const grid = [];
      for (let i = 0; i < 10; i++) {
        grid.push(arr.slice(i * 10, (i + 1) * 10));
      }

      result.push({
        time: obj._time,
        grid
      });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// API Heatmap dekosierungs test
app.get("/api/getAllHeatmaps", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:3600)
  `;

  const result = [];

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      // Base64 → Uint8Array → JS Array
      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));

      // Array in 10x10 Matrix umwandeln
      const grid = [];
      for (let i = 0; i < 10; i++) {
        grid.push(arr.slice(i * 10, (i + 1) * 10));
      }

      result.push({
        time: obj._time,
        grid: grid
      });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// API Peeks dekosierungs test
app.get("/api/getPeaks", async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "peakX" or r._field == "peakY" or r._field == "peakValue")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:15)  // 3 Felder * 5 Datensätze
  `;

  const grouped = {};

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      if (!grouped[obj._time]) {
        grouped[obj._time] = { time: obj._time };
      }

      grouped[obj._time][obj._field] = obj._value;
    }

    // Nur die letzten 5 zusammengefassten Datensätze
    const result = Object.values(grouped).slice(0, 5);

    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// API Start
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});

const shutdown = async () => {
  console.log('🛑 Shutting down API service...');

  try {
    await writeApi.close();
    console.log('✅ Influx write API closed.');
  } catch (e) {
    console.warn('⚠️ Error closing write API:', e.message);
  }

  process.exit(0);
};

process.on('SIGTERM', shutdown);
