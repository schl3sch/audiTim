// __tests__/getLiveHeatmap.test.js
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../index');

describe('GET /api/getLiveHeatmap', () => {
  beforeEach(() => {
    app.locals.bucket = 'testBucket';
  });

  afterEach(() => {
    app.locals.queryApi = undefined;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns latest base64-decoded 10x10 grid and localized time, uses correct query', async () => {
    const bytes = Array.from({ length: 100 }, (_, i) => i);
    const base64 = Buffer.from(Uint8Array.from(bytes)).toString('base64');

    const localeSpy = jest
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('04.09.2025, 12:00:00');

    const row = {
      _time: '2025-09-04T10:00:00.000Z',
      _field: 'base64',
      _value: base64,
    };

    const toObject = jest.fn(() => row);

    const iterateRows = jest.fn(async function* (q) {
      expect(typeof q).toBe('string');
      expect(q).toEqual(expect.stringContaining('from(bucket:'));
      expect(q).toEqual(expect.stringContaining('|> range(start:'));
      expect(q).toEqual(expect.stringContaining('stop:'));
      expect(q).toEqual(expect.stringContaining('heatmap_arr'));
      expect(q).toEqual(expect.stringContaining('_field == "base64"'));
      expect(q).toEqual(expect.stringContaining('sort(columns: ["_time"], desc: true)'));
      expect(q).toEqual(expect.stringContaining('limit(n: 1)'));

      yield { values: 'V1', tableMeta: { toObject } };
    });

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLiveHeatmap');

    expect(res.status).toBe(200);

    const expectedGrid = [];
    for (let i = 0; i < 10; i++) {
      expectedGrid.push(bytes.slice(i * 10, (i + 1) * 10));
    }

    expect(res.body).toEqual({
      data: {
        time: '04.09.2025, 12:00:00',
        grid: expectedGrid,
      },
    });

    expect(iterateRows).toHaveBeenCalledTimes(1);
    expect(toObject).toHaveBeenCalledWith('V1');

    localeSpy.mockRestore();
  });

  test('breaks after first (newest) row even if more rows are available', async () => {
    const bytes1 = Array(100).fill(7);
    const base641 = Buffer.from(Uint8Array.from(bytes1)).toString('base64');
    const bytes2 = Array(100).fill(9);
    const base642 = Buffer.from(Uint8Array.from(bytes2)).toString('base64');

    const localeSpy = jest
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('04.09.2025, 12:01:00');

    const rows = [
      { _time: '2025-09-04T10:01:00.000Z', _field: 'base64', _value: base641 },
      { _time: '2025-09-04T10:00:59.000Z', _field: 'base64', _value: base642 },
    ];

    const toObject = jest
      .fn()
      .mockImplementationOnce(() => rows[0])
      .mockImplementationOnce(() => rows[1]);

    const iterateRows = jest.fn(async function* () {
      yield { values: 'A', tableMeta: { toObject } };
      yield { values: 'B', tableMeta: { toObject } }; // wird wegen break ignoriert
    });

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLiveHeatmap');

    expect(res.status).toBe(200);
    const expectedGrid = [];
    for (let i = 0; i < 10; i++) expectedGrid.push(Array(10).fill(7));

    expect(res.body).toEqual({
      data: { time: '04.09.2025, 12:01:00', grid: expectedGrid },
    });

    expect(toObject).toHaveBeenCalledTimes(1);
    localeSpy.mockRestore();
  });

  test('returns null when no data', async () => {
    const iterateRows = jest.fn(async function* () {});
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLiveHeatmap');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: null });
  });

  test('handles error thrown on iterateRows call (sync throw)', async () => {
    const iterateRows = jest.fn(() => {
      throw new Error('fail');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLiveHeatmap');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });

  test('handles error thrown during iteration (async generator throws)', async () => {
    const iterateRows = jest.fn(async function* () {
      throw new Error('boom');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/getLiveHeatmap');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
