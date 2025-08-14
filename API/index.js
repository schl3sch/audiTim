require('dotenv').config();
const fs = require('fs');
const express = require('express');
const { InfluxDB, Point } = require('@influxdata/influxdb-client');

const app = express();
const PORT = 3000;

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
      |> range(start: 0)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: false)
  `;

  const result = {};
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = Math.min(row._value, 3.5);
      const time = row._time;
      if (!result[sid]) result[sid] = [];
      result[sid].push({ time, decibel });
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
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> limit(n: 5)
  `;

  const result = {};
  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = Math.min(row._value, 3.5);
      const time = row._time;
      if (!result[sid]) result[sid] = [];
      result[sid].push({ time, decibel });
    }
    res.json(result);
  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).send('Query failed');
  }
});

// Write dummy data
app.get('/api/generate', async (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync('./mock-data/dummyData.json', 'utf8'));

    data.forEach(({ timestamp, sensor_1, sensor_2, sensor_3, sensor_4 }) => {
      const point = new Point('sensor_data')
        .floatField('sensor_1', sensor_1)
        .floatField('sensor_2', sensor_2)
        .floatField('sensor_3', sensor_3)
        .floatField('sensor_4', sensor_4)
        .timestamp(new Date(timestamp));
      writeApi.writePoint(point);
    });

    //await writeApi.close(); // wenn kommentiert während laufzeit DB öfter beschreibbar
    console.log(`${data.length} dummy values written.`);
    res.status(200).json({ message: `${data.length} dummy values written.` });
  } catch (error) {
    console.error('❌ Failed to write data:', error);
    res.status(500).json({ error: 'Failed to write data', details: error.message });
  }
});

// Read latest value per sensor
// calculate Array for heatmap
// GET /api/getArray – Heatmap basierend auf Inverser Distanzgewichtung (IDW) mit Peekerkennung durch WCL
// Heatmap basierend auf sensor_1–sensor_4
app.get('/api/getArray', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -5m)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) =>
        r._field == "sensor_1" or
        r._field == "sensor_2" or
        r._field == "sensor_3" or
        r._field == "sensor_4"
      )
      |> sort(columns: ["_time"], desc: true)
      |> limit(n:1)
  `;

  const sensorMapping = {
    d1: "sensor1",
    d2: "sensor2",
    d3: "sensor3",
    d4: "sensor4",
  };

  const sensorPositions = {
    d1: { x: 0, y: 0 },
    d2: { x: 1, y: 0 },
    d3: { x: 0, y: 1 },
    d4: { x: 1, y: 1 },
  };

  // -----------------------------------------
  // Einstellbare Parameter
  const peakStrengthFactor = 1.5; // z.B. 1.0 = normal, 2.0 = doppelt so stark wie der Maximalwert
  const idwFlatteningPower = 2.0; // z.B. 2.0 = Standard, 1.2 = abgeflacht, 4.0 = steiler
  const gridSize = 10;
  // -----------------------------------------
  const fieldToCorner = {
    sensor_1: "d1", // top-left
    sensor_2: "d2", // top-right
    sensor_3: "d3", // bottom-left
    sensor_4: "d4", // bottom-right
  };

  const sensorValues = {};
  const rawSensorData = [];

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const field = row._field;
      const value = row._value;

      rawSensorData.push({ field, value });

      if (fieldToCorner[field]) {
        const corner = fieldToCorner[field];
        sensorValues[corner] = value;
      }
    }

    if (Object.keys(sensorValues).length !== 4) {
      return res.status(400).json({
        error: "Not all 4 required sensor fields present in data.",
        expectedFields: Object.keys(fieldToCorner),
        receivedMapped: sensorValues,
        receivedRaw: rawSensorData
      });
    }

    // WCL Peak-Bestimmung
    const epsilon = 0.0001;
    let sumWeightedX = 0;
    let sumWeightedY = 0;
    let sumWeights = 0;

    for (const [key, value] of Object.entries(sensorValues)) {
      const pos = sensorPositions[key];
      const weight = value;
      sumWeightedX += weight * pos.x;
      sumWeightedY += weight * pos.y;
      sumWeights += weight;
    }

    const peakX = sumWeightedX / (sumWeights || epsilon);
    const peakY = sumWeightedY / (sumWeights || epsilon);
    const peakValue = Math.max(...Object.values(sensorValues)) * peakStrengthFactor;

    // Interpolationspunkte inkl. virtuellem Peak
    const interpolationPoints = [
      ...Object.entries(sensorPositions).map(([key, pos]) => ({
        x: pos.x,
        y: pos.y,
        value: sensorValues[key],
      })),
      { x: peakX, y: peakY, value: peakValue },
    ];

    // IDW Interpolation
    const grid = [];
    for (let row = 0; row < gridSize; row++) {
      const y = row / (gridSize - 1);
      const rowData = [];

      for (let col = 0; col < gridSize; col++) {
        const x = col / (gridSize - 1);
        let numerator = 0;
        let denominator = 0;

        for (const point of interpolationPoints) {
          const dx = x - point.x;
          const dy = y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || epsilon;
          const weight = 1 / Math.pow(distance, idwFlatteningPower);
          numerator += point.value * weight;
          denominator += weight;
        }

        const interpolatedValue = numerator / denominator;
        rowData.push(Number(interpolatedValue.toFixed(2)));
      }

      grid.push(rowData);
    }

    res.json({
      heatmap: grid,
      peak: {
        x: Number(peakX.toFixed(4)),
        y: Number(peakY.toFixed(4)),
        value: Number(peakValue.toFixed(2))
      },
      settings: {
        peakStrengthFactor,
        idwFlatteningPower
      }
    });

  } catch (err) {
    console.error("❌ Query failed:", err);
    res.status(500).send("Query failed");
  }
});

// multiple heatmap frames (dummy)
app.get('/api/getArrays', (req, res) => {
  try {
    const mockData = JSON.parse(fs.readFileSync('./mock-data/mockdataArrays.json', 'utf8'));
    res.json(mockData);
  } catch (err) {
    console.error("❌ Failed to load mockdata.json:", err);
    res.status(500).send("Failed to load mock data");
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
