const path = require('path');

module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFiles: [path.join(__dirname, 'jest.setup.js')]
};
