import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { ROLE_KEYS } from "@/lib/auth/permissions";
import { unauthorizedAccessResponse } from "@/lib/auth/api-response";
import { getPermissionAccess } from "@/lib/auth/server";
import { getServerEnv } from "@/lib/env";
import { hasSameOrigin } from "@/lib/http/same-origin";
import {
  readJsonBody,
  RequestBodyTooLargeError,
} from "@/lib/http/read-json-body";

const roleBody = z.object({ roleKey: z.enum(ROLE_KEYS) }).strict();
const userIdSchema = z.uuid();

export async function POST(
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
  const access = await getPermissionAccess("user.roles.manage");
  const rejected = unauthorizedAccessResponse(access);
  if (rejected) return rejected;

  const { userId } = await params;
  if (!userIdSchema.safeParse(userId).success) {
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
  const parsed = roleBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 422 });
  }

  if (access.kind !== "allowed") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const { error } = await access.supabase.rpc("assign_user_role", {
      target_user_id: userId,
      target_role_key: parsed.data.roleKey,
    });
    if (error) {
      return NextResponse.json(
        { error: "ROLE_ASSIGNMENT_REJECTED" },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "AUTHORIZATION_UNAVAILABLE" },
      { status: 503 },
    );
  }
  return NextResponse.json({ status: "assigned" });
}

export async function DELETE(
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
  const access = await getPermissionAccess("user.roles.manage");
  const rejected = unauthorizedAccessResponse(access);
  if (rejected) return rejected;

  const { userId } = await params;
  if (!userIdSchema.safeParse(userId).success) {
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
  const parsed = roleBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 422 });
  }

  if (access.kind !== "allowed") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  try {
    const { error } = await access.supabase.rpc("revoke_user_role", {
      target_user_id: userId,
      target_role_key: parsed.data.roleKey,
    });
    if (error) {
      return NextResponse.json(
        { error: "ROLE_REVOCATION_REJECTED" },
        { status: 409 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "AUTHORIZATION_UNAVAILABLE" },
      { status: 503 },
    );
  }
  return NextResponse.json({ status: "revoked" });
}
