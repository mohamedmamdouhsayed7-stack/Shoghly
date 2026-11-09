import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { BackendEnvironment } from "../config/environment";
import { IdempotencyService } from "../common/idempotency.service";
import { PrismaService } from "../database/prisma.service";
import { QuotaReservationService } from "../submissions/quota-reservation.service";
import { getVerifiedMultiplier } from "../submissions/submissions.service";
import { RejectSubmissionDto } from "../submissions/submission.dto";
import {
  calculateApprovedReward,
  getApprovalEligibility,
} from "../rewards/reward.engine";

const APPROVAL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly quota: QuotaReservationService,
    @Inject("BACKEND_ENV") private readonly env: BackendEnvironment,
  ) {}

  pending() {
    return this.prisma.submission.findMany({
      where: { status: "PENDING" },
      include: {
        task: true,
        version: true,
        evidence: true,
        worker: { select: { id: true } },
      },
      orderBy: { submittedAt: "asc" },
    });
  }

  approve(
    actorId: string,
    requestId: string,
    submissionId: string,
    key: string,
  ) {
    return this.idempotency.execute({
      actorId,
      key,
      operation: `submission.approve:${submissionId}`,
      body: { submissionId },
      action: async (tx) => {
        await tx.$executeRaw`
          INSERT INTO approval_gates (user_id, updated_at)
          SELECT worker_id, now() FROM submissions WHERE id = ${submissionId}::uuid
          ON CONFLICT (user_id) DO NOTHING
        `;
        const gateRows = await tx.$queryRaw<
          Array<{ user_id: string; last_approved_at: Date | null }>
        >`
          SELECT user_id, last_approved_at FROM approval_gates
          WHERE user_id = (SELECT worker_id FROM submissions WHERE id = ${submissionId}::uuid)
          FOR UPDATE
        `;
        if (!gateRows.length)
          throw new NotFoundException("Submission not found.");

        const submission = await lockSubmission(tx, submissionId);
        if (submission.status !== "PENDING")
          throw new ConflictException(
            "Submission is no longer pending review.",
          );
        if (
          submission.workerId === actorId ||
          submission.task.createdById === actorId
        ) {
          throw new ForbiddenException(
            "A worker or task creator cannot review this submission.",
          );
        }
        const reviewedAt = new Date();
        const lastApprovedAt = gateRows[0].last_approved_at;
        const eligibility = getApprovalEligibility(lastApprovedAt, reviewedAt);
        if (!eligibility.eligible) {
          throw new ConflictException({
            code: "APPROVAL_COOLDOWN",
            message: "Worker is not eligible for another approved task yet.",
            nextEligibleAt: eligibility.nextEligibleAt!.toISOString(),
            remainingMs: eligibility.remainingMs,
          });
        }

        const snapshot =
          this.env.REWARD_MULTIPLIER_SNAPSHOT_POLICY === "submission"
            ? {
                multiplier:
                  submission.multiplierSnapshot ?? new Prisma.Decimal(1),
                subscriptionId: submission.subscriptionSnapshotId,
              }
            : await getVerifiedMultiplier(tx, submission.workerId, reviewedAt);
        const reward = calculateApprovedReward(snapshot.multiplier);
        const base = submission.version.rewardBaseIqd;
        if (base !== reward.baseRewardIqd) {
          throw new ConflictException(
            "The task reward snapshot does not match the confirmed base reward.",
          );
        }

        await this.quota.consume(tx, submission.id);
        const updated = await tx.submission.update({
          where: { id: submission.id },
          data: {
            status: "APPROVED",
            reviewedAt,
            reviewedById: actorId,
            multiplierPolicy: this.env.REWARD_MULTIPLIER_SNAPSHOT_POLICY,
            multiplierSnapshot: snapshot.multiplier,
            subscriptionSnapshotId: snapshot.subscriptionId,
          },
        });
        await tx.rewardTransaction.create({
          data: {
            userId: submission.workerId,
            submissionId: submission.id,
            subscriptionId: snapshot.subscriptionId,
            type: "TASK_APPROVAL",
            amountIqd: reward.amountIqd,
            baseRewardIqd: base,
            multiplier: snapshot.multiplier,
            idempotencyKey: `submission-approval:${submission.id}`,
          },
        });
        await tx.approvalGate.update({
          where: { userId: submission.workerId },
          data: { lastApprovedAt: reviewedAt },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "submission.approved",
            targetType: "submission",
            targetId: submission.id,
            requestId,
            details: {
              rewardIqd: reward.amountIqd,
              baseRewardIqd: base,
              multiplier: snapshot.multiplier.toString(),
            },
          },
        });
        return {
          id: updated.id,
          status: updated.status,
          reviewedAt: reviewedAt.toISOString(),
          reward: {
            amountIqd: reward.amountIqd,
            baseRewardIqd: base,
            multiplier: snapshot.multiplier.toString(),
          },
          nextEligibleAt: new Date(
            reviewedAt.getTime() + APPROVAL_COOLDOWN_MS,
          ).toISOString(),
        } as Prisma.InputJsonValue;
      },
    });
  }

  reject(
    actorId: string,
    requestId: string,
    submissionId: string,
    key: string,
    dto: RejectSubmissionDto,
  ) {
    const reason = dto.reason.trim();
    if (reason.length < 1)
      throw new ConflictException("A rejection reason is required.");
    return this.idempotency.execute({
      actorId,
      key,
      operation: `submission.reject:${submissionId}`,
      body: { submissionId, reason },
      action: async (tx) => {
        const submission = await lockSubmission(tx, submissionId);
        if (submission.status !== "PENDING")
          throw new ConflictException(
            "Submission is no longer pending review.",
          );
        if (
          submission.workerId === actorId ||
          submission.task.createdById === actorId
        ) {
          throw new ForbiddenException(
            "A worker or task creator cannot review this submission.",
          );
        }
        await this.quota.release(tx, submission.id);
        const updated = await tx.submission.update({
          where: { id: submission.id },
          data: {
            status: "REJECTED",
            reviewedAt: new Date(),
            reviewedById: actorId,
            rejectionReason: reason,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "submission.rejected",
            targetType: "submission",
            targetId: submission.id,
            requestId,
            details: { reason },
          },
        });
        return {
          id: updated.id,
          status: updated.status,
          rejectionReason: reason,
        } as Prisma.InputJsonValue;
      },
    });
  }
}

async function lockSubmission(
  tx: Prisma.TransactionClient,
  submissionId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM submissions WHERE id = ${submissionId}::uuid FOR UPDATE
  `;
  if (!rows.length) throw new NotFoundException("Submission not found.");
  const submission = await tx.submission.findUnique({
    where: { id: submissionId },
    include: { task: true, version: true },
  });
  if (!submission) throw new NotFoundException("Submission not found.");
  return submission;
}
