import { spawn } from "node:child_process";
import { resolve } from "node:path";

const port = process.env.PORT ?? "3000";
const nextCli = resolve("node_modules/next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextCli, "dev", "--hostname", "127.0.0.1", "--port", port],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      APP_ENV: "development",
      SHOGHLY_DEMO_MODE: "true",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    child.kill(signal);
    const forceExit = setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
      process.exit(signal === "SIGINT" ? 130 : 0);
    }, 2_000);
    forceExit.unref();
  });
}

child.on("error", (error) => {
  process.stderr.write(`Unable to start the local demo: ${error.message}\n`);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  if (stopping) process.exit(signal === "SIGINT" ? 130 : 0);
  process.exit(signal ? 1 : (code ?? 1));
});
