const request = require('supertest');
const app = require('../index');

describe('GET /api/getPeaks', () => {
  test('returns last 15 peaks', async () => {
    const rows = [];
    for (let i = 0; i < 15; i++) {
      ['peakX', 'peakY', 'peakValue'].forEach(field => {
        rows.push({ _time: `t${i}`, _field: field, _value: i });
      });
    }
    const iterateRows = jest.fn(async function* () {
      for (const r of rows) {
        yield { values: null, tableMeta: { toObject: () => r } };
      }
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getPeaks');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(15);
  });

  test('handles errors', async () => {
    const iterateRows = jest.fn(() => { throw new Error('fail'); });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getPeaks');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
