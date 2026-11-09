import "server-only";

import { cookies, headers } from "next/headers";
import {
  DEMO_ACCOUNT_COOKIE,
  DEMO_ACCOUNTS,
  isDemoModeAllowed,
  type DemoAccountKey,
} from "@/lib/mvp/demo-mode-policy";

export async function isLocalDemoModeRequest(): Promise<boolean> {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.APP_ENV !== "development" ||
    process.env.SHOGHLY_DEMO_MODE !== "true"
  ) {
    return false;
  }

  const requestHeaders = await headers();
  return isDemoModeAllowed({
    nodeEnv: process.env.NODE_ENV,
    appEnv: process.env.APP_ENV,
    enabled: process.env.SHOGHLY_DEMO_MODE,
    host: requestHeaders.get("host"),
  });
}

export async function getLocalDemoAccount(): Promise<DemoAccountKey> {
  if (!(await isLocalDemoModeRequest())) return "worker";
  const account = (await cookies()).get(DEMO_ACCOUNT_COOKIE)?.value;
  return account && account in DEMO_ACCOUNTS
    ? (account as DemoAccountKey)
    : "worker";
}
