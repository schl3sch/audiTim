// __tests__/sensorRange.test.js
const request = require('supertest');
const app = require('../index');

describe('GET /api/sensorRange', () => {
  afterEach(() => {
    app.locals.queryApi = undefined;
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns oldest and newest timestamps and uses correct queries', async () => {
    const toObjectOld = jest.fn(() => ({ _time: 'old' }));
    const toObjectNew = jest.fn(() => ({ _time: 'new' }));

    const iterateRows = jest
      .fn()
      // 1. Call: oldest (asc)
      .mockImplementationOnce(async function* (q) {
        expect(typeof q).toBe('string');
        yield { values: 'V1', tableMeta: { toObject: toObjectOld } };
      })
      // 2. Call: newest (desc)
      .mockImplementationOnce(async function* (q) {
        expect(typeof q).toBe('string');
        yield { values: 'V2', tableMeta: { toObject: toObjectNew } };
      });

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/sensorRange');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ oldest: 'old', newest: 'new' });

    expect(iterateRows).toHaveBeenCalledTimes(2);

    expect(iterateRows).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('desc: false')
    );
    expect(iterateRows).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('desc: true')
    );

    expect(toObjectOld).toHaveBeenCalledWith('V1');
    expect(toObjectNew).toHaveBeenCalledWith('V2');
  });

  test('returns empty object when no data is returned (oldest & newest both missing)', async () => {
    const iterateRows = jest
      .fn()
      .mockImplementationOnce(async function* () {})
      .mockImplementationOnce(async function* () {});

    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/sensorRange');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });

  test('handles error thrown on iterateRows call (synchronous throw)', async () => {
    const iterateRows = jest.fn(() => {
      throw new Error('fail');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/sensorRange');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });

  test('handles error thrown during iteration (async generator throws)', async () => {
    const iterateRows = jest.fn(async function* () {
      throw new Error('boom');
    });
    app.locals.queryApi = { iterateRows };

    const res = await request(app).get('/api/sensorRange');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Error querying InfluxDB' });
  });
});
