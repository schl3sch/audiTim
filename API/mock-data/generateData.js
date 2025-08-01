const fs = require('fs');

const sensors = ['sensor1', 'sensor2', 'sensor3', 'sensor4'];
const entriesPerSensor = 50;
const startTime = new Date('2025-07-21T20:00:00Z');

const data = [];

sensors.forEach(sensorId => {
  for (let i = 0; i < entriesPerSensor; i++) {
    const timestamp = new Date(startTime.getTime() + (i * 10000)); // alle 10 Sekunden
    const decibel = +(Math.random() * 5).toFixed(2);
    data.push({
      sensor_id: sensorId,
      decibel,
      timestamp: timestamp.toISOString()
    });
  }
});

fs.writeFileSync('dummyData.json', JSON.stringify(data, null, 2));
console.log('dummyData.json generated with 200 entries');
