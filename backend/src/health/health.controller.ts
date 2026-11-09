import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../common/public.decorator";
import { PrismaService } from "../database/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: "ok",
        database: "ok",
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException("The database is unavailable.");
    }
  }
}
