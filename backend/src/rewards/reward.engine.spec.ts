import { Prisma } from "@prisma/client";
import {
  calculateApprovedReward,
  getApprovalEligibility,
} from "./reward.engine";

describe("reward ledger calculation", () => {
  it("uses the confirmed 250 IQD base and a verified multiplier", () => {
    expect(calculateApprovedReward(new Prisma.Decimal(1))).toEqual({
      amountIqd: 250,
      baseRewardIqd: 250,
    });
    expect(calculateApprovedReward(new Prisma.Decimal("1.5"))).toEqual({
      amountIqd: 375,
      baseRewardIqd: 250,
    });
  });

  it("fails closed instead of inventing a fractional IQD rounding rule", () => {
    expect(() => calculateApprovedReward(new Prisma.Decimal("1.25"))).toThrow(
      /integer IQD/,
    );
  });

  it("enforces the exact rolling 24-hour boundary", () => {
    const approvalAt = new Date("2026-11-09T10:00:00.000Z");
    const oneMillisecondEarly = getApprovalEligibility(
      approvalAt,
      new Date(approvalAt.getTime() + 24 * 60 * 60 * 1000 - 1),
    );
    expect(oneMillisecondEarly.eligible).toBe(false);
    expect(oneMillisecondEarly.remainingMs).toBe(1);
    expect(
      getApprovalEligibility(
        approvalAt,
        new Date(approvalAt.getTime() + 24 * 60 * 60 * 1000),
      ),
    ).toEqual({ eligible: true, nextEligibleAt: null, remainingMs: 0 });
  });
});
