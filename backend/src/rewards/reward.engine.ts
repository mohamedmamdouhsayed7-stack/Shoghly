import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";

export const CONFIRMED_BASE_REWARD_IQD = 250;

export function calculateApprovedReward(multiplier: Prisma.Decimal) {
  if (!multiplier.isPositive()) {
    throw new ConflictException(
      "A verified positive subscription multiplier is required.",
    );
  }
  const amount = new Prisma.Decimal(CONFIRMED_BASE_REWARD_IQD).mul(multiplier);
  if (!amount.isInteger() || !Number.isSafeInteger(amount.toNumber())) {
    throw new ConflictException(
      "The configured reward does not resolve to an integer IQD amount.",
    );
  }
  return {
    amountIqd: amount.toNumber(),
    baseRewardIqd: CONFIRMED_BASE_REWARD_IQD,
  };
}

export function getApprovalEligibility(lastApprovedAt: Date | null, now: Date) {
  if (lastApprovedAt === null) {
    return { eligible: true as const, nextEligibleAt: null, remainingMs: 0 };
  }
  const nextEligibleAt = new Date(
    lastApprovedAt.getTime() + 24 * 60 * 60 * 1000,
  );
  const remainingMs = Math.max(0, nextEligibleAt.getTime() - now.getTime());
  return remainingMs === 0
    ? { eligible: true as const, nextEligibleAt: null, remainingMs: 0 }
    : { eligible: false as const, nextEligibleAt, remainingMs };
}
