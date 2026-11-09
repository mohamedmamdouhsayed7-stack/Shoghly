import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

const mode = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;
const appEnv = process.env.APP_ENV;
const allowedDatabaseNames = new Set([
  "shoghly_backend_disposable",
  "shoghly_backend_test",
]);

let database;
try {
  database = new URL(databaseUrl ?? "");
} catch {
  process.stderr.write(
    "Refusing migration: DATABASE_URL is missing or invalid.\n",
  );
  process.exit(1);
}
const host = database.hostname.replace(/^\[|\]$/g, "");
const name = decodeURIComponent(database.pathname.slice(1));
if (
  !["development", "test"].includes(appEnv ?? "") ||
  !["127.0.0.1", "localhost", "::1"].includes(host) ||
  !allowedDatabaseNames.has(name)
) {
  process.stderr.write(
    "Refusing migration: only a loopback disposable Shoghly database is allowed by this script.\n",
  );
  process.exit(1);
}
if (!["dev", "deploy"].includes(mode ?? "")) {
  process.stderr.write("Usage: node scripts/prisma-local.mjs <dev|deploy>\n");
  process.exit(2);
}

const cli = resolve("node_modules/prisma/build/index.js");
const result = spawnSync(
  process.execPath,
  [cli, "migrate", mode === "dev" ? "dev" : "deploy"],
  {
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
  },
);
if (result.error) {
  process.stderr.write("Unable to start Prisma migration command.\n");
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
