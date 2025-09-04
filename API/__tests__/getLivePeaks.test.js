// __tests__/getLivePeaks.test.js
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');

describe('GET /api/getLivePeaks', () => {
  beforeEach(() => {
    app.locals.bucket = 'testBucket';
  });

  afterEach(() => {
    app.locals.queryApi = undefined;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns latest peak (aggregates fields for same timestamp) and uses correct query', async () => {
    const rows = [
      { _time: 't1', _field: 'peakX', _value: 1 },
      { _time: 't1', _field: 'peakY', _value: 2 },
      { _time: 't1', _field: 'peakValue', _value: 3 },
    ];

    const toObject = jest
      .fn()
      .mockImplementationOnce(() => rows[0])
      .mockImplementationOnce(() => rows[1])
      .mockImplementationOnce(() => rows[2]);

    const iterateRows = jest.fn(async function* (q) {
      expect(typeof q).toBe('string');
      expect(q).toEqual(expect.stringContaining('from(bucket:'));
      expect(q).toEqual(expect.stringContaining('heatmap_arr'));
      expect(q).toEqual(expect.stringContaining('limit(n: 1)'));
      expect(q).toEqual(expect.stringContaining('_field == "peakX"'));
      expect(q).toEqual(expect.stringContaining('or r._field == "peakY"'));
      expect(q).toEqual(expect.stringContaining('or r._field == "peakValue"'));
      expect(q).toEqual(expect.stringContaining('range(start:'));
      expect(q).toEqual(expect.stringContaining('stop:'));

      yield { values: 'V1', tableMeta: { toObject } };
      yield { values: 'V2', tableMeta: { toObject } };
      yield { values: 'V3', tableMeta: { toObject } };
    });

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLivePeaks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { time: 't1', peakX: 1, peakY: 2, peakValue: 3 },
    });

    expect(iterateRows).toHaveBeenCalledTimes(1);
    expect(toObject).toHaveBeenNthCalledWith(1, 'V1');
    expect(toObject).toHaveBeenNthCalledWith(2, 'V2');
    expect(toObject).toHaveBeenNthCalledWith(3, 'V3');
  });

  test('when multiple timestamps arrive (per-table limit), returns the first (latest) group seen', async () => {
    const rows = [
      { _time: 't2', _field: 'peakX', _value: 10 },
      { _time: 't1', _field: 'peakY', _value: 20 },
      { _time: 't1', _field: 'peakValue', _value: 30 },
    ];

    const toObject = jest
      .fn()
      .mockImplementationOnce(() => rows[0])
      .mockImplementationOnce(() => rows[1])
      .mockImplementationOnce(() => rows[2]);

    const iterateRows = jest.fn(async function* () {
      yield { values: null, tableMeta: { toObject } };
      yield { values: null, tableMeta: { toObject } };
      yield { values: null, tableMeta: { toObject } };
    });

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLivePeaks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: { time: 't2', peakX: 10 },
    });
    expect(toObject).toHaveBeenCalledTimes(3);
  });

  test('returns null when no data', async () => {
    const iterateRows = jest.fn(async function* () {});
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLivePeaks');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: null });
  });

  test('handles error thrown on iterateRows call (sync throw)', async () => {
    const iterateRows = jest.fn(() => {
      throw new Error('fail');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLivePeaks');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });

  test('handles error thrown during iteration (async generator throws)', async () => {
    const iterateRows = jest.fn(async function* () {
      throw new Error('boom');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLivePeaks');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
