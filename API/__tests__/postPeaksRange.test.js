const request = require('supertest');
const app = require('../index');

describe('POST /api/postPeaksRange', () => {
  test('validates body', async () => {
    const res = await request(app).post('/api/postPeaksRange').send({});
    expect(res.status).toBe(400);
  });

  test('groups peaks by time', async () => {
    const rows = [
      { _time: 't1', _field: 'peakX', _value: 1 },
      { _time: 't1', _field: 'peakY', _value: 2 },
      { _time: 't1', _field: 'peakValue', _value: 3 },
      { _time: 't2', _field: 'peakX', _value: 4 }
    ];
    const iterateRows = jest.fn(async function* () {
      for (const r of rows) {
        yield { values: null, tableMeta: { toObject: () => r } };
      }
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app)
      .post('/api/postPeaksRange')
      .send({ start: 0, stop: 1 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [
      { time: 't1', peakX: 1, peakY: 2, peakValue: 3 },
      { time: 't2', peakX: 4 }
    ] });
  });

  test('handles errors', async () => {
    const iterateRows = jest.fn(() => { throw new Error('fail'); });
    app.locals.queryApi = { iterateRows };

    const res = await request(app)
      .post('/api/postPeaksRange')
      .send({ start: 0, stop: 1 });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
