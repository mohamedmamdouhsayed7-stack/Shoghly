import { Module } from "@nestjs/common";
import { IdempotencyService } from "../common/idempotency.service";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Module({
  controllers: [TasksController],
  providers: [TasksService, IdempotencyService],
  exports: [TasksService],
})
export class TasksModule {}
