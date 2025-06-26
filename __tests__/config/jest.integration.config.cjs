module.exports = {
  rootDir: "../..",
  testMatch: ["<rootDir>/__tests__/integration/**/*.js"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/config/setup.integration.mjs"],
  transform: { "^.+\\.m?[jt]sx?$": "babel-jest" },
  testEnvironment: "node",
  transformIgnorePatterns: [],
  testTimeout: 100000,
  globals: {
    "ts-jest": {
      isolatedModules: true,
    },
  },
};
