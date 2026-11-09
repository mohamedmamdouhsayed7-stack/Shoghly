import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { IdempotencyService } from "../common/idempotency.service";
import { PrismaService } from "../database/prisma.service";
import type { SaveTaskDto } from "./tasks.dto";

export const BASE_TASK_REWARD_IQD = 250;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
  ) {}

  listActive() {
    return this.prisma.task.findMany({
      where: {
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
  }

  async getActiveTask(taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    if (!task) throw new NotFoundException("Task not found.");
    return task;
  }

  async create(
    actorId: string,
    requestId: string,
    key: string,
    dto: SaveTaskDto,
  ) {
    const expiresAt = parseExpiration(dto.expiresAt);
    return this.idempotency.execute({
      actorId,
      key,
      operation: "task.create",
      body: dto,
      action: async (tx) => {
        const task = await tx.task.create({
          data: {
            createdById: actorId,
            expiresAt,
            status: "DRAFT",
            versions: {
              create: {
                version: 1,
                title: dto.title.trim(),
                summary: dto.summary.trim(),
                description: dto.description.trim(),
                externalUrl: dto.externalUrl,
                instructions: dto.instructions.trim(),
                rewardBaseIqd: BASE_TASK_REWARD_IQD,
                evidenceRequired: dto.evidenceRequired ?? true,
              },
            },
          },
          include: { versions: true },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "task.created",
            targetType: "task",
            targetId: task.id,
            requestId,
            details: { version: 1, rewardBaseIqd: BASE_TASK_REWARD_IQD },
          },
        });
        return task as unknown as Prisma.InputJsonValue;
      },
    });
  }

  async update(
    actorId: string,
    requestId: string,
    taskId: string,
    key: string,
    dto: SaveTaskDto,
  ) {
    const expiresAt = parseExpiration(dto.expiresAt);
    return this.idempotency.execute({
      actorId,
      key,
      operation: `task.update:${taskId}`,
      body: dto,
      action: async (tx) => {
        await lockTask(tx, taskId);
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException("Task not found.");
        const version = task.currentVersion + 1;
        const updated = await tx.task.update({
          where: { id: task.id },
          data: {
            currentVersion: version,
            expiresAt,
            updatedAt: new Date(),
            versions: {
              create: {
                version,
                title: dto.title.trim(),
                summary: dto.summary.trim(),
                description: dto.description.trim(),
                externalUrl: dto.externalUrl,
                instructions: dto.instructions.trim(),
                rewardBaseIqd: BASE_TASK_REWARD_IQD,
                evidenceRequired: dto.evidenceRequired ?? true,
              },
            },
          },
          include: { versions: { orderBy: { version: "desc" }, take: 1 } },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "task.updated",
            targetType: "task",
            targetId: task.id,
            requestId,
            details: { version },
          },
        });
        return updated as unknown as Prisma.InputJsonValue;
      },
    });
  }

  async setStatus(
    actorId: string,
    requestId: string,
    taskId: string,
    key: string,
    active: boolean,
  ) {
    return this.idempotency.execute({
      actorId,
      key,
      operation: `task.status:${taskId}:${active}`,
      body: { active },
      action: async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task) throw new NotFoundException("Task not found.");
        if (active && task.expiresAt && task.expiresAt <= new Date()) {
          throw new ConflictException("An expired task cannot be published.");
        }
        const updated = await tx.task.update({
          where: { id: taskId },
          data: {
            status: active ? "ACTIVE" : "INACTIVE",
            updatedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: active ? "task.published" : "task.deactivated",
            targetType: "task",
            targetId: updated.id,
            requestId,
            details: { status: updated.status },
          },
        });
        return updated as unknown as Prisma.InputJsonValue;
      },
    });
  }
}

function parseExpiration(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
    throw new ConflictException("Task expiration must be a future timestamp.");
  }
  return date;
}

async function lockTask(tx: Prisma.TransactionClient, taskId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM tasks WHERE id = ${taskId}::uuid FOR UPDATE
  `;
  if (!rows.length) throw new NotFoundException("Task not found.");
}
