module.exports = {
  rootDir: '../..',
  testMatch: ['<rootDir>/__tests__/unit/**/*.js'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/config/setup.unit.mjs'],
  transform: { '^.+\.m?[jt]sx?$': 'babel-jest' },
  testEnvironment: 'node'
};