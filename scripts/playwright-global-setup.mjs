import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

const port = Number(process.env.PORT ?? 3000);
const baseUrl = `http://127.0.0.1:${port}`;
const startupTimeoutMs = 120_000;

export default async function globalSetup() {
  const server = spawn(
    process.execPath,
    [
      "./node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        APP_ENV: "development",
        APP_URL: baseUrl,
        SUPABASE_URL: process.env.SUPABASE_TEST_URL ?? "",
        SUPABASE_PUBLISHABLE_KEY:
          process.env.SUPABASE_TEST_PUBLISHABLE_KEY ?? "",
      },
      stdio: "ignore",
      windowsHide: true,
    },
  );

  let startupError;
  server.once("error", (error) => {
    startupError = error;
  });

  try {
    const deadline = Date.now() + startupTimeoutMs;
    while (Date.now() < deadline) {
      if (startupError) throw startupError;
      if (server.exitCode !== null) {
        throw new Error(
          `Next.js exited with code ${server.exitCode} before becoming ready.`,
        );
      }

      try {
        const response = await fetch(baseUrl, {
          signal: AbortSignal.timeout(2_000),
        });
        if (response.ok) return () => stopServer(server);
      } catch {
        // Keep polling until Next.js is ready or the startup deadline expires.
      }

      await delay(250);
    }

    throw new Error(
      `Next.js did not become available at ${baseUrl} within ${startupTimeoutMs}ms.`,
    );
  } catch (error) {
    await stopServer(server);
    throw error;
  }
}

async function stopServer(server) {
  if (server.exitCode !== null || server.killed) return;

  server.kill();
  await Promise.race([
    once(server, "close"),
    delay(5_000).then(() => {
      throw new Error(
        `Next.js process ${server.pid} did not stop after termination.`,
      );
    }),
  ]);
}
