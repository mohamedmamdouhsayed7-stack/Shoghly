import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { IdempotencyService } from "../common/idempotency.service";
import type { BackendEnvironment } from "../config/environment";
import { Inject } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service";
import { QuotaReservationService } from "./quota-reservation.service";
import type { CreateSubmissionDto } from "./submission.dto";

@Injectable()
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly quota: QuotaReservationService,
    @Inject("BACKEND_ENV") private readonly env: BackendEnvironment,
  ) {}

  async create(
    workerId: string,
    taskId: string,
    key: string,
    dto: CreateSubmissionDto,
  ) {
    const evidenceText = dto.evidenceText?.trim() ?? "";
    const evidenceUrl = dto.evidenceUrl?.trim() ?? "";
    if (evidenceUrl && !isSafeEvidenceUrl(evidenceUrl)) {
      throw new ConflictException(
        "Evidence URL must use HTTPS without embedded credentials.",
      );
    }
    return this.idempotency.execute({
      actorId: workerId,
      key,
      operation: `submission.create:${taskId}`,
      body: { evidenceText, evidenceUrl },
      action: async (tx) => {
        await lockTask(tx, taskId);
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (
          !task ||
          task.status !== "ACTIVE" ||
          (task.expiresAt && task.expiresAt <= new Date())
        ) {
          throw new NotFoundException("Task is not available.");
        }
        const existing = await tx.submission.findFirst({
          where: { taskId, workerId, status: { in: ["PENDING", "APPROVED"] } },
        });
        if (existing)
          throw new ConflictException(
            "An active or approved submission already exists for this task.",
          );

        const version = await tx.taskVersion.findUnique({
          where: { taskId_version: { taskId, version: task.currentVersion } },
        });
        if (!version)
          throw new ConflictException(
            "The published task version is unavailable.",
          );
        if (version.evidenceRequired && !evidenceText && !evidenceUrl) {
          throw new ConflictException(
            "This task requires completion evidence.",
          );
        }

        const snapshot =
          this.env.REWARD_MULTIPLIER_SNAPSHOT_POLICY === "submission"
            ? await getVerifiedMultiplier(tx, workerId, new Date())
            : null;
        const submission = await tx.submission.create({
          data: {
            taskId,
            taskVersion: version.version,
            workerId,
            status: "PENDING",
            multiplierPolicy: this.env.REWARD_MULTIPLIER_SNAPSHOT_POLICY,
            multiplierSnapshot: snapshot?.multiplier,
            subscriptionSnapshotId: snapshot?.subscriptionId,
            evidence: {
              create: [
                ...(evidenceText
                  ? [{ kind: "TEXT", textValue: evidenceText }]
                  : []),
                ...(evidenceUrl
                  ? [{ kind: "URL", urlValue: evidenceUrl }]
                  : []),
              ],
            },
          },
          include: { evidence: true },
        });
        await this.quota.reserve(tx, workerId, submission.id);
        return submission as unknown as Prisma.InputJsonValue;
      },
    });
  }

  myHistory(workerId: string) {
    return this.prisma.submission.findMany({
      where: { workerId },
      include: {
        task: { select: { id: true, currentVersion: true, status: true } },
        version: true,
        evidence: true,
        rewards: true,
      },
      orderBy: { submittedAt: "desc" },
    });
  }
}

export async function getVerifiedMultiplier(
  tx: Prisma.TransactionClient,
  userId: string,
  asOf: Date,
): Promise<{ multiplier: Prisma.Decimal; subscriptionId: string | null }> {
  const subscription = await tx.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      verifiedAt: { not: null },
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: asOf } }] },
        { OR: [{ endsAt: null }, { endsAt: { gt: asOf } }] },
      ],
    },
    orderBy: { verifiedAt: "desc" },
  });
  return subscription
    ? {
        multiplier: subscription.rewardMultiplier,
        subscriptionId: subscription.id,
      }
    : { multiplier: new Prisma.Decimal(1), subscriptionId: null };
}

function isSafeEvidenceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

async function lockTask(tx: Prisma.TransactionClient, taskId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE
  `;
  if (!rows.length) throw new NotFoundException("Task not found.");
}
