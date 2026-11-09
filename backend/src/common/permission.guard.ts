import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createClient } from "@supabase/supabase-js";
import { Inject } from "@nestjs/common";
import type { BackendEnvironment } from "../config/environment";
import type { RequestWithContext } from "./request-context";
import {
  REQUIRED_PERMISSION,
  type BackendPermission,
} from "./permissions.decorator";

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject("BACKEND_ENV") private readonly env: BackendEnvironment,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<BackendPermission>(
      REQUIRED_PERMISSION,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    if (!request.user || !request.supabaseAccessToken) {
      throw new UnauthorizedException();
    }
    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: { Authorization: `Bearer ${request.supabaseAccessToken}` },
        },
      },
    );
    const { data, error } = await supabase.rpc("has_permission", {
      permission_name: permission,
    });
    if (error)
      throw new UnauthorizedException("Unable to verify account permission.");
    if (data !== true)
      throw new ForbiddenException(
        "You are not allowed to perform this action.",
      );
    return true;
  }
}
