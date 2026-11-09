import { Controller, Get, Req } from "@nestjs/common";
import type { RequestWithContext } from "../common/request-context";
import { PrismaService } from "../database/prisma.service";

@Controller("me/subscriptions")
export class SubscriptionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listForCurrentUser(@Req() request: RequestWithContext) {
    return this.prisma.subscription.findMany({
      where: { userId: request.user!.id },
      select: {
        id: true,
        status: true,
        rewardMultiplier: true,
        startsAt: true,
        endsAt: true,
        verifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
