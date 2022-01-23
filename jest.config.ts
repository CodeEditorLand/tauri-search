/* eslint-disable unicorn/import-style */
import type { Config } from "@jest/types";
import { resolve } from "path";

const config: Config.InitialOptions = {
  verbose: true,
  // roots: ["tests", "src"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testPathIgnorePatterns: ["/node_modules/"],
  moduleNameMapper: {
    "^[/]{0,1}~/(.*)$": resolve(process.cwd(), "src", "$1"),
  },
  testMatch: ["test/**/?(*[-.])+(spec|test).ts"],
  setupFilesAfterEnv: ["jest-extended"],
  testEnvironment: "node",
};

export default config;
