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

    await writeApi.close();
    console.log(`${data.length} dummy values written.`);
    res.status(200).json({ message: `${data.length} dummy values written.` });
  } catch (error) {
    console.error('❌ Failed to write data:', error);
    res.status(500).json({ error: 'Failed to write data', details: error.message });
  }
});

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
