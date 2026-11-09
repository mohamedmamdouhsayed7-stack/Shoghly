import { NextResponse } from "next/server";
import type { PermissionAccess } from "@/lib/auth/server";

export function unauthorizedAccessResponse(access: PermissionAccess) {
  switch (access.kind) {
    case "unconfigured":
      return NextResponse.json(
        { error: "AUTH_CONFIGURATION_REQUIRED" },
        { status: 503 },
      );
    case "anonymous":
      return NextResponse.json(
        { error: "AUTHENTICATION_REQUIRED" },
        { status: 401 },
      );
    case "unverified":
      return NextResponse.json(
        { error: "EMAIL_VERIFICATION_REQUIRED" },
        { status: 403 },
      );
    case "suspended":
    case "disabled":
    case "forbidden":
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    case "unavailable":
      return NextResponse.json(
        { error: "AUTHORIZATION_UNAVAILABLE" },
        { status: 503 },
      );
    case "allowed":
      return null;
  }
}
