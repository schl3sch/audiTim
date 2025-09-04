// __tests__/postSensorRange.test.js
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');

describe('POST /api/sensorRange', () => {
  beforeEach(() => {
    // damit der Query-String einen Bucket enthält, den wir prüfen können
    app.locals.bucket = 'testBucket';
  });

  afterEach(() => {
    app.locals.queryApi = undefined;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('validates body', async () => {
    const res = await request(app).post('/api/sensorRange').send({});
    expect(res.status).toBe(400);
  });

  test('calculates averages (chunks of 10) and uses correct query', async () => {
    // 12 Werte -> zwei Chunks: [0..9] (mid=t5), [10..11] (mid=t11)
    const rows = Array.from({ length: 12 }, (_, i) => ({
      _field: 's1',
      _value: 1,
      _time: `t${i}`,
    }));

    let idx = 0;
    const toObject = jest.fn(() => rows[idx++]);

    const iterateRows = jest.fn(async function* (q) {
      // Grundlegende Query-Checks
      expect(typeof q).toBe('string');
      expect(q).toEqual(expect.stringContaining('from(bucket: "testBucket")'));
      expect(q).toEqual(expect.stringContaining('range(start: 0, stop: 1)'));
      expect(q).toEqual(expect.stringContaining('group(columns: ["_field"])'));
      expect(q).toEqual(expect.stringContaining('sort(columns: ["_time"], desc: true)'));

      for (let i = 0; i < 12; i++) {
        yield { values: `V${i}`, tableMeta: { toObject } };
      }
    });

    app.locals.queryApi = { iterateRows };

    const res = await request(app)
      .post('/api/sensorRange')
      .send({ start: 0, stop: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { s1: [{ time: 't5', value: 1 }, { time: 't11', value: 1 }] },
    });
    expect(iterateRows).toHaveBeenCalledTimes(1);
    expect(toObject).toHaveBeenCalledTimes(12);
  });

  test('handles errors', async () => {
    const iterateRows = jest.fn(() => {
      throw new Error('fail');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app)
      .post('/api/sensorRange')
      .send({ start: 0, stop: 1 });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
