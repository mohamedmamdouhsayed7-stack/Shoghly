import { ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { IdempotencyService } from "./idempotency.service";

describe("idempotent mutations", () => {
  it("replays a completed response without running the mutation twice", async () => {
    const response = { id: "existing", state: "created" };
    const tx = {
      $queryRaw: jest.fn(),
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash: expect.any(String),
          status: "COMPLETED",
          response,
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    const hash = createHash("sha256")
      .update('{"body":{"title":"task"},"operation":"task.create"}')
      .digest("hex");
    tx.idempotencyRecord.findUnique.mockResolvedValue({
      requestHash: hash,
      status: "COMPLETED",
      response,
    });
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const service = new IdempotencyService(prisma as never);
    const action = jest.fn();

    await expect(
      service.execute({
        actorId: "user-id",
        key: "request-001",
        operation: "task.create",
        body: { title: "task" },
        action,
      }),
    ).resolves.toEqual(response);
    expect(action).not.toHaveBeenCalled();
  });

  it("rejects reusing a key with a different request body", async () => {
    const tx = {
      $queryRaw: jest.fn(),
      idempotencyRecord: {
        findUnique: jest.fn().mockResolvedValue({
          requestHash: "different",
          status: "COMPLETED",
          response: {},
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (value: unknown) => unknown) =>
        callback(tx),
      ),
    };
    const service = new IdempotencyService(prisma as never);
    await expect(
      service.execute({
        actorId: "user-id",
        key: "request-001",
        operation: "task.create",
        body: { title: "task" },
        action: async () => ({ id: "new" }),
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
