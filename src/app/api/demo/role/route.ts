import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isLocalDemoModeRequest } from "@/lib/mvp/demo-mode";
import {
  DEMO_ACCOUNT_COOKIE,
  type DemoAccountKey,
} from "@/lib/mvp/demo-mode-policy";

export const dynamic = "force-dynamic";

const accountSchema = z
  .object({
    account: z.enum(["worker", "task-admin", "review-admin"]),
  })
  .strict();

export async function POST(request: NextRequest) {
  if (!(await isLocalDemoModeRequest())) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const originHeader = request.headers.get("origin");
  const requestHost = request.headers.get("host");
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(
      originHeader &&
      requestHost &&
      new URL(originHeader).origin ===
        new URL(`${request.nextUrl.protocol}//${requestHost}`).origin,
    );
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json(
      { error: "INVALID_CONTENT_TYPE" },
      { status: 415 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = accountSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ACCOUNT" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_ACCOUNT_COOKIE, parsed.data.account, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 4 * 60 * 60,
  });

  return NextResponse.json(
    { account: parsed.data.account as DemoAccountKey },
    { headers: { "Cache-Control": "no-store" } },
  );
}
