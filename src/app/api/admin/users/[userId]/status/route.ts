import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { unauthorizedAccessResponse } from "@/lib/auth/api-response";
import { getPermissionAccess } from "@/lib/auth/server";
import { getServerEnv } from "@/lib/env";
import { hasSameOrigin } from "@/lib/http/same-origin";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/http/read-json-body";

const statusBody = z
  .object({ status: z.enum(["active", "suspended", "disabled"]) })
  .strict();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  let appUrl: string;
  try {
    appUrl = getServerEnv().APP_URL;
  } catch {
    return NextResponse.json(
      { error: "APP_CONFIGURATION_REQUIRED" },
      { status: 503 },
    );
  }
  if (!hasSameOrigin(request, appUrl)) {
    return NextResponse.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const access = await getPermissionAccess("user.status.manage");
  const rejected = unauthorizedAccessResponse(access);
  if (rejected) return rejected;

  const { userId } = await params;
  if (!z.uuid().safeParse(userId).success) {
    return NextResponse.json({ error: "INVALID_USER_ID" }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof RequestBodyTooLargeError
            ? "REQUEST_TOO_LARGE"
            : "INVALID_REQUEST",
      },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
  }
  const parsed = statusBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_STATUS" }, { status: 422 });
  }
  if (access.kind !== "allowed") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  try {
    const { error } = await access.supabase.rpc("change_user_status", {
      target_user_id: userId,
      new_status: parsed.data.status,
    });
    if (error) {
      return NextResponse.json(
        { error: "STATUS_CHANGE_REJECTED" },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "AUTHORIZATION_UNAVAILABLE" },
      { status: 503 },
    );
  }
  return NextResponse.json({ status: "updated" });
}
