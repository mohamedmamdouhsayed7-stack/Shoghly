export const BASE_TASK_REWARD_IQD = 250;
export const APPROVAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type DemoTask = {
  id: string;
  title: string;
  summary: string;
  description: string;
  externalUrl: string;
  instructions: string;
  rewardBaseIqd: number;
  evidenceRequired: boolean;
  active: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type DemoSubmissionStatus = "pending" | "approved" | "rejected";

export type DemoSubmission = {
  id: string;
  taskId: string;
  userId: string;
  evidenceText: string;
  evidenceUrl: string | null;
  rewardBaseIqdSnapshot: number;
  rewardMultiplierSnapshot: number;
  status: DemoSubmissionStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
  rewardIqd: number | null;
};

export type DemoState = {
  schemaVersion: 1;
  tasks: DemoTask[];
  submissions: DemoSubmission[];
};

export type Eligibility =
  | { eligible: true; nextApprovalAt: null; remainingMs: 0 }
  | { eligible: false; nextApprovalAt: string; remainingMs: number };

export function getApprovalEligibility(
  submissions: readonly DemoSubmission[],
  userId: string,
  now = Date.now(),
): Eligibility {
  const latestApproval = submissions
    .filter((submission) => submission.userId === userId)
    .filter((submission) => submission.status === "approved")
    .map((submission) => Date.parse(submission.reviewedAt ?? ""))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  if (latestApproval === undefined) {
    return { eligible: true, nextApprovalAt: null, remainingMs: 0 };
  }

  const nextApproval = latestApproval + APPROVAL_COOLDOWN_MS;
  const remainingMs = Math.max(0, nextApproval - now);
  if (remainingMs === 0) {
    return { eligible: true, nextApprovalAt: null, remainingMs: 0 };
  }

  return {
    eligible: false,
    nextApprovalAt: new Date(nextApproval).toISOString(),
    remainingMs,
  };
}

export function calculateRewardIqd(
  baseRewardIqd: number,
  verifiedMultiplier: number,
): number {
  if (
    !Number.isSafeInteger(baseRewardIqd) ||
    baseRewardIqd < 0 ||
    !Number.isFinite(verifiedMultiplier) ||
    verifiedMultiplier <= 0
  ) {
    throw new Error("إعداد المكافأة أو المضاعف غير صالح.");
  }

  const reward = baseRewardIqd * verifiedMultiplier;
  if (!Number.isSafeInteger(reward)) {
    throw new Error("تعذّر حساب مكافأة صحيحة وفق إعداد العملة الحالي.");
  }
  return reward;
}

export function getDemoVerifiedSubscriptionMultiplier(
  userId: string,
  subscriptions: readonly {
    userId: string;
    active: boolean;
    verified: boolean;
    rewardMultiplier: number;
  }[] = [],
): number {
  const ownVerifiedSubscription = subscriptions.find(
    (subscription) =>
      subscription.userId === userId &&
      subscription.active &&
      subscription.verified,
  );
  // No verified subscription data is connected in this MVP, so the default is 1×.
  return ownVerifiedSubscription?.rewardMultiplier ?? 1;
}

export function formatIqd(amount: number): string {
  return `${new Intl.NumberFormat("ar-IQ", {
    maximumFractionDigits: 0,
  }).format(amount)} د.ع`;
}

export function formatRemainingTime(milliseconds: number): string {
  const totalMinutes = Math.max(0, Math.ceil(milliseconds / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و${minutes} دقيقة`;
}

export function isValidExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
