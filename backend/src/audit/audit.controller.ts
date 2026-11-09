import { Controller, Get, Query } from "@nestjs/common";
import { RequirePermission } from "../common/permissions.decorator";
import { PrismaService } from "../database/prisma.service";

@Controller("admin/audit")
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission("audit.read")
  @Get()
  list(@Query("limit") rawLimit?: string) {
    const limit = Math.min(100, Math.max(1, Number(rawLimit) || 50));
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        actorId: true,
        action: true,
        targetType: true,
        targetId: true,
        requestId: true,
        details: true,
        createdAt: true,
      },
    });
  }
}
