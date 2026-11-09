import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from "@nestjs/common";
import type { RequestWithContext } from "../common/request-context";
import { RequirePermission } from "../common/permissions.decorator";
import { requireIdempotencyKey } from "../common/idempotency-key";
import { TasksService } from "./tasks.service";
import { SaveTaskDto } from "./tasks.dto";

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  listActive() {
    return this.tasks.listActive();
  }

  @Get(":taskId")
  getTask(@Param("taskId", ParseUUIDPipe) taskId: string) {
    return this.tasks.getActiveTask(taskId);
  }

  @RequirePermission("task.manage.write")
  @Post()
  create(
    @Req() request: RequestWithContext,
    @Headers("idempotency-key") key: string,
    @Body() dto: SaveTaskDto,
  ) {
    return this.tasks.create(
      request.user!.id,
      request.requestId,
      requireIdempotencyKey(key),
      dto,
    );
  }

  @RequirePermission("task.manage.write")
  @Patch(":taskId")
  update(
    @Req() request: RequestWithContext,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Headers("idempotency-key") key: string,
    @Body() dto: SaveTaskDto,
  ) {
    return this.tasks.update(
      request.user!.id,
      request.requestId,
      taskId,
      requireIdempotencyKey(key),
      dto,
    );
  }

  @RequirePermission("task.manage.publish")
  @Post(":taskId/publish")
  publish(
    @Req() request: RequestWithContext,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Headers("idempotency-key") key: string,
  ) {
    return this.tasks.setStatus(
      request.user!.id,
      request.requestId,
      taskId,
      requireIdempotencyKey(key),
      true,
    );
  }

  @RequirePermission("task.manage.publish")
  @Post(":taskId/deactivate")
  deactivate(
    @Req() request: RequestWithContext,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Headers("idempotency-key") key: string,
  ) {
    return this.tasks.setStatus(
      request.user!.id,
      request.requestId,
      taskId,
      requireIdempotencyKey(key),
      false,
    );
  }
}
