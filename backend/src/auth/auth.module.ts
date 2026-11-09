import { Module } from "@nestjs/common";
import { SupabaseAuthGuard } from "../common/auth.guard";
import { PermissionGuard } from "../common/permission.guard";

@Module({
  providers: [SupabaseAuthGuard, PermissionGuard],
  exports: [SupabaseAuthGuard, PermissionGuard],
})
export class AuthModule {}
