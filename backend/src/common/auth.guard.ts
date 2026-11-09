import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createClient, type User } from "@supabase/supabase-js";
import { Inject } from "@nestjs/common";
import type { BackendEnvironment } from "../config/environment";
import type { RequestWithContext } from "./request-context";
import { IS_PUBLIC } from "./public.decorator";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject("BACKEND_ENV") private readonly env: BackendEnvironment,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer ([^\s]+)$/i);
    if (!match)
      throw new UnauthorizedException("A valid bearer token is required.");

    const supabase = createClient(
      this.env.SUPABASE_URL,
      this.env.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: { headers: { Authorization: `Bearer ${match[1]}` } },
      },
    );
    let data: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"];
    let error: Awaited<ReturnType<typeof supabase.auth.getUser>>["error"];
    try {
      ({ data, error } = await supabase.auth.getUser(match[1]));
    } catch {
      throw new ServiceUnavailableException(
        "Authentication verification is temporarily unavailable.",
      );
    }
    if (error || !data.user || !data.user.email_confirmed_at) {
      throw new UnauthorizedException(
        "The access token is invalid or the email is not verified.",
      );
    }

    let accountStatus: string | null;
    let statusError: unknown;
    try {
      const statusResult = await supabase.rpc("get_my_account_status");
      accountStatus = statusResult.data;
      statusError = statusResult.error;
    } catch {
      throw new ServiceUnavailableException(
        "Account status is temporarily unavailable.",
      );
    }
    if (statusError || accountStatus !== "active") {
      throw new UnauthorizedException("The account is not active.");
    }

    request.user = toAuthenticatedUser(data.user);
    try {
      await this.prisma.user.upsert({
        where: { id: data.user.id },
        create: { id: data.user.id },
        update: {},
      });
    } catch {
      throw new ServiceUnavailableException(
        "The application data store is unavailable.",
      );
    }
    request.supabaseAccessToken = match[1];
    return true;
  }
}

function toAuthenticatedUser(user: User): { id: string; email?: string } {
  return { id: user.id, ...(user.email ? { email: user.email } : {}) };
}
