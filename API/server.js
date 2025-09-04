// server.js
const app = require('./index');

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
  // Optional: einfacher Connection-Test
  const { queryApi } = app.locals;
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

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${PORT}`);
  });

  const shutdown = async () => {
    console.log('🛑 Shutting down API service...');
    try {
      if (app.locals.writeApi) {
        await app.locals.writeApi.close();
        console.log('✅ Influx write API closed.');
      }
    } catch (e) {
      console.warn('⚠️ Error closing write API:', e.message);
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

module.exports = app;
