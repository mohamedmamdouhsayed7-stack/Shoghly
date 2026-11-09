import { ConflictException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

export const FREE_LIFETIME_TASK_LIMIT = 5;

@Injectable()
export class QuotaReservationService {
  async reserve(
    tx: Prisma.TransactionClient,
    userId: string,
    submissionId: string,
  ) {
    await tx.$executeRaw`
      UPDATE quota_grants
      SET expired_units = expired_units + (granted_units - reserved_units - consumed_units - expired_units - revoked_units)
      WHERE user_id = ${userId}::uuid
        AND expires_at <= now()
        AND granted_units > reserved_units + consumed_units + expired_units + revoked_units
    `;
    await tx.$executeRaw`
      INSERT INTO quota_grants (id, user_id, source, granted_units)
      VALUES (gen_random_uuid(), ${userId}::uuid, 'FREE_LIFETIME', ${FREE_LIFETIME_TASK_LIMIT})
      ON CONFLICT (user_id) WHERE source = 'FREE_LIFETIME' DO NOTHING
    `;

    const grants = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM quota_grants
      WHERE user_id = ${userId}::uuid
        AND revoked_at IS NULL
        AND (expires_at IS NULL OR expires_at > now())
        AND granted_units > reserved_units + consumed_units + expired_units + revoked_units
      ORDER BY CASE source WHEN 'SUBSCRIPTION' THEN 0 ELSE 1 END,
        expires_at ASC NULLS LAST,
        created_at ASC
      LIMIT 1
      FOR UPDATE
    `;
    const grant = grants[0];
    if (!grant)
      throw new ConflictException("No task quota is currently available.");

    await tx.quotaGrant.update({
      where: { id: grant.id },
      data: { reservedUnits: { increment: 1 } },
    });
    await tx.reservation.create({
      data: { submissionId, quotaGrantId: grant.id },
    });
    return grant.id;
  }

  async consume(tx: Prisma.TransactionClient, submissionId: string) {
    const reservation = await tx.reservation.findUnique({
      where: { submissionId },
    });
    if (!reservation || reservation.status !== "RESERVED") {
      throw new ConflictException(
        "This submission has no active quota reservation.",
      );
    }
    const updated = await tx.quotaGrant.updateMany({
      where: { id: reservation.quotaGrantId, reservedUnits: { gt: 0 } },
      data: {
        reservedUnits: { decrement: 1 },
        consumedUnits: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new ConflictException("The quota reservation is inconsistent.");
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "CONSUMED", resolvedAt: new Date() },
    });
  }

  async release(tx: Prisma.TransactionClient, submissionId: string) {
    const reservation = await tx.reservation.findUnique({
      where: { submissionId },
    });
    if (!reservation || reservation.status !== "RESERVED") {
      throw new ConflictException(
        "This submission has no active quota reservation.",
      );
    }
    const grant = await tx.quotaGrant.findUnique({
      where: { id: reservation.quotaGrantId },
    });
    if (!grant || grant.reservedUnits < 1)
      throw new ConflictException("The quota reservation is inconsistent.");
    const expired = grant.expiresAt !== null && grant.expiresAt <= new Date();
    const revoked = grant.revokedAt !== null;
    const updated = await tx.quotaGrant.updateMany({
      where: { id: reservation.quotaGrantId, reservedUnits: { gt: 0 } },
      data: {
        reservedUnits: { decrement: 1 },
        ...(expired ? { expiredUnits: { increment: 1 } } : {}),
        ...(!expired && revoked ? { revokedUnits: { increment: 1 } } : {}),
      },
    });
    if (updated.count !== 1)
      throw new ConflictException("The quota reservation is inconsistent.");
    await tx.reservation.update({
      where: { id: reservation.id },
      data: { status: "RELEASED", resolvedAt: new Date() },
    });
  }
}
