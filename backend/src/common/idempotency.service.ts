import { ConflictException, Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service";

@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async execute<T extends Prisma.InputJsonValue>(input: {
    actorId: string;
    key: string;
    operation: string;
    body: unknown;
    action: (tx: Prisma.TransactionClient) => Promise<T>;
  }): Promise<T> {
    const bodyHash = createHash("sha256")
      .update(stableStringify({ operation: input.operation, body: input.body }))
      .digest("hex");

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.actorId}), hashtext(${input.key}))`;
        const existing = await tx.idempotencyRecord.findUnique({
          where: { actorId_key: { actorId: input.actorId, key: input.key } },
        });
        if (existing) {
          if (existing.requestHash !== bodyHash) {
            throw new ConflictException(
              "Idempotency key was already used for a different request.",
            );
          }
          if (existing.status === "COMPLETED" && existing.response !== null) {
            return existing.response as T;
          }
          throw new ConflictException(
            "This request is already being processed.",
          );
        }

        const record = await tx.idempotencyRecord.create({
          data: {
            actorId: input.actorId,
            key: input.key,
            requestHash: bodyHash,
          },
        });
        const result = await input.action(tx);
        await tx.idempotencyRecord.update({
          where: { id: record.id },
          data: {
            status: "COMPLETED",
            response: result,
            completedAt: new Date(),
          },
        });
        return result;
      },
      { isolationLevel: "ReadCommitted", maxWait: 5_000, timeout: 15_000 },
    );
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([left], [right]) => left.localeCompare(right),
    );
    return `{${entries.map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}
