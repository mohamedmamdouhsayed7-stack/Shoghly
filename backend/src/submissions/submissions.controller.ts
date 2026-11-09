import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from "@nestjs/common";
import type { RequestWithContext } from "../common/request-context";
import { requireIdempotencyKey } from "../common/idempotency-key";
import { CreateSubmissionDto } from "./submission.dto";
import { SubmissionsService } from "./submissions.service";

@Controller()
export class SubmissionsController {
  constructor(private readonly submissions: SubmissionsService) {}

  @Post("tasks/:taskId/submissions")
  create(
    @Req() request: RequestWithContext,
    @Param("taskId", ParseUUIDPipe) taskId: string,
    @Headers("idempotency-key") key: string,
    @Body() dto: CreateSubmissionDto,
  ) {
    return this.submissions.create(
      request.user!.id,
      taskId,
      requireIdempotencyKey(key),
      dto,
    );
  }

  @Get("me/submissions")
  history(@Req() request: RequestWithContext) {
    return this.submissions.myHistory(request.user!.id);
  }
}
