import { Controller, Get, Req } from "@nestjs/common";
import type { RequestWithContext } from "../common/request-context";
import { PrismaService } from "../database/prisma.service";

@Controller("me/rewards")
export class RewardsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async currentUserLedger(@Req() request: RequestWithContext) {
    const userId = request.user!.id;
    const [entries, aggregate] = await Promise.all([
      this.prisma.rewardTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          type: true,
          amountIqd: true,
          baseRewardIqd: true,
          multiplier: true,
          submissionId: true,
          createdAt: true,
        },
      }),
      this.prisma.rewardTransaction.aggregate({
        where: { userId },
        _sum: { amountIqd: true },
      }),
    ]);
    return { balanceIqd: aggregate._sum.amountIqd ?? 0, entries };
  }
}
