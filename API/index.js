// index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { InfluxDB } = require('@influxdata/influxdb-client');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(cors());

// Influx-Setup
const influx = new InfluxDB({
  url: process.env.INFLUX_URL || '',
  token: process.env.INFLUX_TOKEN || '',
});
const org = process.env.INFLUX_ORG || '';
const bucket = process.env.INFLUX_BUCKET || '';

app.locals.bucket = bucket;
app.locals.queryApi = influx.getQueryApi(org);
app.locals.writeApi = influx.getWriteApi(org, bucket, 'ns');

// Postgres (pg) Pool
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgresql',
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  user: process.env.POSTGRES_USER || 'auditim',
  password: process.env.POSTGRES_PASSWORD || '',
  database: process.env.POSTGRES_DB || 'postgres',
});
app.locals.pgPool = pgPool;

pgPool.query('SELECT 1').then(() => {
  console.log('✅ Connected to Postgres');
}).catch((err) => {
  console.warn('⚠️ Could not connect to Postgres on startup:', err.message);
});

// ====== Routes & existing code below (unchanged except we mount auth router) ======

// (The rest of your existing code is kept exactly — heatmap, sensorRange, etc.)
// I will append the existing routes (unchanged) here so the file remains complete:

// Ältester & neuester Timestamp pro Sensor
app.get('/api/sensorRange', async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

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
  const { queryApi, bucket } = req.app.locals;
  const { start, stop } = req.body;

  
  if (start == null || stop == null) {
    return res.status(400).json({ error: "Bitte start und stop im Body als Timestamps angeben" });
  }

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

    // Durchschnitt pro 10 Werte berechnen
    const reducedResult = {};
    for (const sensor in result) {
      reducedResult[sensor] = [];
      const valuesArray = result[sensor];
      for (let i = 0; i < valuesArray.length; i += 10) {
        const chunk = valuesArray.slice(i, i + 10);
        const avgValue = chunk.reduce((sum, v) => sum + v.value, 0) / chunk.length;
        const time = chunk[Math.floor(chunk.length / 2)].time; // mittlerer Timestamp
        reducedResult[sensor].push({ time, value: avgValue });
      }
    }

    res.json({ data: reducedResult });
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).json({ error: 'Error querying InfluxDB' });
  }
});

// Live-Sensoren (letzte Minute)
app.get('/api/sensorLive', async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${oneMinuteAgo.toISOString()}, stop: ${now.toISOString()})
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> group(columns: ["_field"])
      |> aggregateWindow(every: 1s, fn: mean, createEmpty: false)
      |> sort(columns: ["_time"])
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

// Neuestes Heatmap-Array (GET)
app.get("/api/getArray", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
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

      latest = { time: obj._time, grid };
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

// Heatmap-Range: ältester & neuester Zeitstempel
app.get("/api/getHeatmapRange", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

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

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      oldest = tableMeta.toObject(values)._time;
    }

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQueryNewest)) {
      newest = tableMeta.toObject(values)._time;
    }

    res.json({ oldest, newest });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Heatmaps im Zeitraum (POST)
app.post("/api/postHeatmapsRange", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;
  const { start, stop } = req.body;

  if (start == null || stop == null) {
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

      result.push({ time: obj._time, grid });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Live-Heatmap (letzte 2s)
app.get("/api/getLiveHeatmap", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

  const now = new Date();
  const twoSecAgo = new Date(now.getTime() - 2 * 1000);

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${twoSecAgo.toISOString()}, stop: ${now.toISOString()})
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 1)
  `;

  try {
    let latest = null;

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      // decode base64 into 10x10 grid
      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));
      const grid = [];
      for (let i = 0; i < 10; i++) {
        grid.push(arr.slice(i * 10, (i + 1) * 10));
      }

      // convert UTC timestamp to local time (Berlin)
      const utcDate = new Date(obj._time);
      const localTime = utcDate.toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        hour12: false,
      });

      latest = { time: localTime, grid };
      break; // only newest one
    }

    res.json({ data: latest });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Durchschnitts-Heatmap (POST)
app.post("/api/postHeatmapAvg", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;
  const { start, stop } = req.body;

  if (start == null || stop == null) {
    return res.status(400).json({ error: "Bitte start und stop im Body als Timestamps angeben" });
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "base64")
      |> sort(columns: ["_time"], desc: true)
  `;

  try {
    const size = 10;
    const sumGrid = Array.from({ length: size }, () => Array(size).fill(0));
    let count = 0;

    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);
      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));

      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
          sumGrid[i][j] += arr[i * size + j];
        }
      }
      count++;
    }

    if (count === 0) {
      return res.json({ data: null, message: "Keine Heatmaps im angegebenen Zeitraum gefunden" });
    }

    const avgGrid = sumGrid.map(row => row.map(val => Math.round(val / count)));

    res.json({
      data: {
        start,
        stop,
        count,
        grid: avgGrid
      }
    });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Status
app.get('/api/status', async (req, res) => {
  const results = {
    nodeRed: false,
    influx: false,
    nodeRedDetails: null
  };

  // Node-RED basic check
  try {
    const nr = await fetch('http://nodered:1880', { method: 'GET' });
    results.nodeRed = nr.ok;

    if (nr.ok) {
      try {
        const detailsRes = await fetch('http://nodered:1880/api/nodered-status', { method: 'GET' });
        if (detailsRes.ok) {
          results.nodeRedDetails = await detailsRes.json();
        }
      } catch (err) {
        results.nodeRedDetails = { error: 'Could not fetch Node-RED details' };
      }
    }
  } catch {
    results.nodeRed = false;
  }

  // Influx check
  try {
    const influxCheck = await fetch('http://influxdb:8086', { method: 'GET' });
    results.influx = influxCheck.ok;
  } catch {
    results.influx = false;
  }

  res.json(results);
});

// Alle Heatmaps der letzten Stunde
app.get("/api/getAllHeatmaps", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

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

      const buffer = Buffer.from(obj._value, "base64");
      const arr = Array.from(new Uint8Array(buffer));

      const grid = [];
      for (let i = 0; i < 10; i++) {
        grid.push(arr.slice(i * 10, (i + 1) * 10));
      }

      result.push({ time: obj._time, grid });
    }

    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Peaks im Zeitraum (POST)
app.post("/api/postPeaksRange", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;
  const { start, stop } = req.body;

  if (start == null || stop == null) {
    return res.status(400).json({ error: "Bitte start und stop im Body als Timestamps angeben" });
  }

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: ${start}, stop: ${stop})
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "peakX" or r._field == "peakY" or r._field == "peakValue")
      |> sort(columns: ["_time"], desc: true)
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
    const result = Object.values(grouped);
    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Letzte Peaks (ohne Range)
app.get("/api/getPeaks", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -1h)
      |> filter(fn: (r) => r._measurement == "heatmap_arr")
      |> filter(fn: (r) => r._field == "peakX" or r._field == "peakY" or r._field == "peakValue")
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:15)
  `;

  const grouped = {};
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);

      if (!grouped[obj._time]) grouped[obj._time] = { time: obj._time };
      grouped[obj._time][obj._field] = obj._value;
    }

    const result = Object.values(grouped);
    res.json({ data: result });
  } catch (error) {
    console.error("Influx query error:", error);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Live-Peaks (letzte 2s)
app.get("/api/getLivePeaks", async (req, res) => {
  const { queryApi, bucket } = req.app.locals;

  const now = new Date();
  const twoSecAgo = new Date(now.getTime() - 2000);

  const fluxQuery = `
    from(bucket: "${bucket}")
    |> range(start: ${twoSecAgo.toISOString()}, stop: ${now.toISOString()})
    |> filter(fn: (r) => r._measurement == "heatmap_arr")
    |> filter(fn: (r) => r._field == "peakX" or r._field == "peakY" or r._field == "peakValue")
    |> sort(columns: ["_time"], desc: true)
    |> limit(n: 1)
  `;

  const grouped = {};

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const obj = tableMeta.toObject(values);
      if (!grouped[obj._time]) grouped[obj._time] = { time: obj._time };
      grouped[obj._time][obj._field] = obj._value;
    }
    const latest = Object.values(grouped)[0] ?? null;
    res.json({ data: latest });
  } catch (error) {
    console.error("Influx query error:", error.message);
    res.status(500).json({ error: "Error querying InfluxDB" });
  }
});

// Mount auth router (neue Datei)
app.use('/api', require('./auth'));

// Export app (server.js startet den Server)
module.exports = app;
