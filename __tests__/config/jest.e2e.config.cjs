module.exports = {
  rootDir: "../..",
  preset: "jest-puppeteer",
  testMatch: ["<rootDir>/__tests__/e2e/**/*.js"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/config/setup.e2e.mjs"],
  transform: { "^.+\\.m?[jt]sx?$": "babel-jest" },
  testEnvironment: "node",
  testTimeout: 50000,
  transformIgnorePatterns: [],
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};
