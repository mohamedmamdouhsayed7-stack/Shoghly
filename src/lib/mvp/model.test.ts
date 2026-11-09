import { describe, expect, it } from "vitest";
import {
  APPROVAL_COOLDOWN_MS,
  calculateRewardIqd,
  getDemoVerifiedSubscriptionMultiplier,
  getApprovalEligibility,
  isValidExternalUrl,
  type DemoSubmission,
} from "@/lib/mvp/model";

const approvedAt = "2026-11-01T07:00:00.000Z";
const submissions: DemoSubmission[] = [
  {
    id: "approved-1",
    taskId: "task-1",
    userId: "worker-1",
    evidenceText: "done",
    evidenceUrl: null,
    rewardBaseIqdSnapshot: 250,
    rewardMultiplierSnapshot: 1,
    status: "approved",
    submittedAt: approvedAt,
    reviewedAt: approvedAt,
    reviewedBy: "reviewer-1",
    rejectionReason: null,
    rewardIqd: 250,
  },
  {
    id: "rejected-1",
    taskId: "task-2",
    userId: "worker-1",
    evidenceText: "again",
    evidenceUrl: null,
    rewardBaseIqdSnapshot: 250,
    rewardMultiplierSnapshot: 1,
    status: "rejected",
    submittedAt: approvedAt,
    reviewedAt: approvedAt,
    reviewedBy: "reviewer-1",
    rejectionReason: "غير واضح",
    rewardIqd: null,
  },
  {
    id: "pending-other-worker",
    taskId: "task-3",
    userId: "worker-2",
    evidenceText: "pending",
    evidenceUrl: null,
    rewardBaseIqdSnapshot: 250,
    rewardMultiplierSnapshot: 1,
    status: "pending",
    submittedAt: approvedAt,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    rewardIqd: null,
  },
];

describe("MVP reward and approval rules", () => {
  it("uses the individual verified multiplier and preserves whole IQD values", () => {
    expect(calculateRewardIqd(250, 1)).toBe(250);
    expect(calculateRewardIqd(250, 2)).toBe(500);
    expect(
      getDemoVerifiedSubscriptionMultiplier("worker-1", [
        {
          userId: "worker-2",
          active: true,
          verified: true,
          rewardMultiplier: 3,
        },
      ]),
    ).toBe(1);
    expect(
      getDemoVerifiedSubscriptionMultiplier("worker-1", [
        {
          userId: "worker-1",
          active: true,
          verified: true,
          rewardMultiplier: 2,
        },
      ]),
    ).toBe(2);
  });

  it("fails closed when a multiplier would create a fractional IQD amount", () => {
    expect(() => calculateRewardIqd(250, 1.001)).toThrow();
  });

  it("applies the rolling 24-hour window at the exact boundary", () => {
    const lastApproval = Date.parse(approvedAt);
    expect(
      getApprovalEligibility(
        submissions,
        "worker-1",
        lastApproval + APPROVAL_COOLDOWN_MS - 1,
      ).eligible,
    ).toBe(false);
    expect(
      getApprovalEligibility(
        submissions,
        "worker-1",
        lastApproval + APPROVAL_COOLDOWN_MS,
      ).eligible,
    ).toBe(true);
  });

  it("ignores pending and rejected submissions for cooldown", () => {
    expect(
      getApprovalEligibility(submissions, "worker-2", Date.now()).eligible,
    ).toBe(true);
    expect(
      getApprovalEligibility(submissions, "new-worker", Date.now()).eligible,
    ).toBe(true);
  });

  it("allows only safe HTTPS task and evidence URLs", () => {
    expect(isValidExternalUrl("https://example.com/task")).toBe(true);
    expect(isValidExternalUrl("http://example.com/task")).toBe(false);
    expect(isValidExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isValidExternalUrl("https://user:pass@example.com")).toBe(false);
  });
});
