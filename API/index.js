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

    data.forEach(({ sensor_id, decibel, timestamp }) => {
      const point = new Point('sensor_data')
        .tag('sensor_id', sensor_id)
        .floatField('decibel', decibel)
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
// GET /api/getArray – Heatmap basierend auf Inverser Distanzgewichtung (IDW)

app.get('/api/getArrayIDW', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
  `;

  const sensorMapping = {
    d1: "sensor1", // top-left
    d2: "sensor2", // top-right
    d3: "sensor3", // bottom-left
    d4: "sensor4", // bottom-right
  };

  const sensorValues = {}; // { d1: x, d2: x, ... }
  const rawSensorData = [];

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = row._value;

      rawSensorData.push({ sensor_id: sid, decibel });

      if (Object.values(sensorMapping).includes(sid)) {
        const key = Object.entries(sensorMapping).find(([_, val]) => val === sid)?.[0];
        if (key) {
          sensorValues[key] = decibel;
        }
      }
    }

    if (Object.keys(sensorValues).length !== 4) {
      return res.status(400).json({
        error: "Not all 4 required sensors present in data.",
        expectedSensors: sensorMapping,
        receivedMapped: sensorValues,
        receivedRaw: rawSensorData
      });
    }

    // Sensorpositionen im normierten Koordinatensystem
    const sensorPositions = {
      d1: { x: 0, y: 0 }, // top-left
      d2: { x: 1, y: 0 }, // top-right
      d3: { x: 0, y: 1 }, // bottom-left
      d4: { x: 1, y: 1 }, // bottom-right
    };

    const power = 2; // IDW: Distanzexponent (2 = inverse quadratische Gewichtung)
    const grid = [];

    for (let row = 0; row < 10; row++) {
      const y = row / 9;
      const rowData = [];

      for (let col = 0; col < 10; col++) {
        const x = col / 9;

        let numerator = 0;
        let denominator = 0;

        for (const [key, { x: sx, y: sy }] of Object.entries(sensorPositions)) {
          const value = sensorValues[key];
          const dx = x - sx;
          const dy = y - sy;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.0001; // Verhindert Division durch 0

          const weight = 1 / Math.pow(distance, power);
          numerator += value * weight;
          denominator += weight;
        }

        const interpolatedValue = numerator / denominator;
        rowData.push(Number(interpolatedValue.toFixed(2)));
      }

      grid.push(rowData);
    }

    res.json({ heatmap: grid });

  } catch (err) {
    console.error("❌ Query failed:", err);
    res.status(500).send("Query failed");
  }
});

app.get('/api/getArrayIB', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
  `;

  const sensorMapping = {
    d1: "sensor1", // top-left
    d2: "sensor2", // top-right
    d3: "sensor3", // bottom-left
    d4: "sensor4", // bottom-right
  };

  const sensorValues = {}; // d1..d4
  const rawSensorData = []; // vollständige Rückgabe

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = row._value;

      rawSensorData.push({ sensor_id: sid, decibel }); // alle empfangenen Werte speichern

      if (Object.values(sensorMapping).includes(sid)) {
        const key = Object.entries(sensorMapping).find(([_, val]) => val === sid)?.[0];
        if (key) {
          sensorValues[key] = decibel;
        }
      }
    }

    if (Object.keys(sensorValues).length !== 4) {
      return res.status(400).json({
        error: "Not all 4 required sensors present in data.",
        expectedSensors: sensorMapping,
        receivedMapped: sensorValues,
        receivedRaw: rawSensorData
      });
    }

    const grid = [];
    for (let row = 0; row < 10; row++) {
      const y = row / 9;
      const rowData = [];
      for (let col = 0; col < 10; col++) {
        const x = col / 9;
        const V =
          sensorValues.d1 * (1 - x) * (1 - y) +
          sensorValues.d2 * x * (1 - y) +
          sensorValues.d3 * (1 - x) * y +
          sensorValues.d4 * x * y;
        rowData.push(Number(V.toFixed(2)));
      }
      grid.push(rowData);
    }

    res.json({ heatmap: grid });

  } catch (err) {
    console.error('❌ Query failed:', err);
    res.status(500).send('Query failed');
  }
});

app.get('/api/getArrayWCL', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
  `;

  const sensorMapping = {
    d1: "sensor1", // top-left
    d2: "sensor2", // top-right
    d3: "sensor3", // bottom-left
    d4: "sensor4", // bottom-right
  };

  const sensorValues = {}; // { d1: x, d2: x, ... }
  const rawSensorData = [];

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = row._value;

      rawSensorData.push({ sensor_id: sid, decibel });

      if (Object.values(sensorMapping).includes(sid)) {
        const key = Object.entries(sensorMapping).find(([_, val]) => val === sid)?.[0];
        if (key) {
          sensorValues[key] = decibel;
        }
      }
    }

    if (Object.keys(sensorValues).length !== 4) {
      return res.status(400).json({
        error: "Not all 4 required sensors present in data.",
        expectedSensors: sensorMapping,
        receivedMapped: sensorValues,
        receivedRaw: rawSensorData
      });
    }

    // Normierte Sensorpositionen
    const sensorPositions = {
      d1: { x: 0, y: 0 }, // top-left
      d2: { x: 1, y: 0 }, // top-right
      d3: { x: 0, y: 1 }, // bottom-left
      d4: { x: 1, y: 1 }, // bottom-right
    };

    // WCL-Gitter (10x10), interpoliert über Abstand zum gewichteten Zentrum
    const power = 2; // optionaler Exponent zur Verstärkung von Gewichten
    const gridSize = 10;
    const grid = [];

    // WCL: Bestimme gewichtetes Zentrum aus Sensorwerten
    let weightedX = 0;
    let weightedY = 0;
    let weightSum = 0;

    for (const [key, { x, y }] of Object.entries(sensorPositions)) {
      const value = sensorValues[key];
      const weight = Math.pow(value, power);
      weightedX += x * weight;
      weightedY += y * weight;
      weightSum += weight;
    }

    const centroidX = weightedX / weightSum;
    const centroidY = weightedY / weightSum;

    // Optional: maximale Distanz zur Skalierung
    const maxDistance = Math.sqrt(2); // Diagonale des normierten Feldes

    for (let row = 0; row < gridSize; row++) {
      const y = row / (gridSize - 1);
      const rowData = [];

      for (let col = 0; col < gridSize; col++) {
        const x = col / (gridSize - 1);

        // Abstand zum gewichteten Zentrum
        const dx = x - centroidX;
        const dy = y - centroidY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Invertierte Gewichtung auf Basis der Distanz zum Zentrum
        const value = 1 - distance / maxDistance; // Normiert auf 0-1
        rowData.push(Number((value * 100).toFixed(2))); // Skaliert auf 0–100 z.B.
      }

      grid.push(rowData);
    }

    res.json({ heatmap: grid, centroid: { x: centroidX, y: centroidY } });

  } catch (err) {
    console.error("❌ Query failed:", err);
    res.status(500).send("Query failed");
  }
});

app.get('/api/getArray', async (req, res) => {
  const fluxQuery = `
    from(bucket: "${bucket}")
      |> range(start: -30d)
      |> filter(fn: (r) => r._measurement == "sensor_data")
      |> filter(fn: (r) => r._field == "decibel")
      |> group(columns: ["sensor_id"])
      |> sort(columns: ["_time"], desc: true)
      |> first()
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

  const sensorValues = {};
  const rawSensorData = [];

  // -----------------------------------------
  // Einstellbare Parameter
  const peakStrengthFactor = 1.5; // z.B. 1.0 = normal, 2.0 = doppelt so stark wie der Maximalwert
  const idwFlatteningPower = 2.0; // z.B. 2.0 = Standard, 1.2 = abgeflacht, 4.0 = steiler
  const gridSize = 10;
  // -----------------------------------------

  try {
    for await (const { values, tableMeta } of queryApi.iterateRows(fluxQuery)) {
      const row = tableMeta.toObject(values);
      const sid = row.sensor_id;
      const decibel = row._value;
      rawSensorData.push({ sensor_id: sid, decibel });

      if (Object.values(sensorMapping).includes(sid)) {
        const key = Object.entries(sensorMapping).find(([_, val]) => val === sid)?.[0];
        if (key) {
          sensorValues[key] = decibel;
        }
      }
    }

    if (Object.keys(sensorValues).length !== 4) {
      return res.status(400).json({
        error: "Not all 4 required sensors present in data.",
        expectedSensors: sensorMapping,
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



app.listen(PORT, '0.0.0.0', () => {
  console.log(`API listening on port ${PORT}`);
});

// Graceful shutdown (fast AF)
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

// Handle Docker stop (SIGTERM)
process.on('SIGTERM', shutdown);
