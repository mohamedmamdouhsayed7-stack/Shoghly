import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { BackendConfigModule } from "./config/config.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./database/prisma.module";
import { HealthModule } from "./health/health.module";
import { TasksModule } from "./tasks/tasks.module";
import { SubmissionsModule } from "./submissions/submissions.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { UsersModule } from "./users/users.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { RewardsModule } from "./rewards/rewards.module";
import { AuditModule } from "./audit/audit.module";
import { SupabaseAuthGuard } from "./common/auth.guard";
import { PermissionGuard } from "./common/permission.guard";

@Module({
  imports: [
    BackendConfigModule,
    PrismaModule,
    AuthModule,
    HealthModule,
    UsersModule,
    TasksModule,
    SubmissionsModule,
    ReviewsModule,
    SubscriptionsModule,
    RewardsModule,
    AuditModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
