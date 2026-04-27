/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.jsx?$": "ts-jest",
  },
  transformIgnorePatterns: ["node_modules/(?!(jose)/)"],
  watchman: false,
};
