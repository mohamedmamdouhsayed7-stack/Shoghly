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
import { RequirePermission } from "../common/permissions.decorator";
import { requireIdempotencyKey } from "../common/idempotency-key";
import type { RequestWithContext } from "../common/request-context";
import { RejectSubmissionDto } from "../submissions/submission.dto";
import { ReviewsService } from "./reviews.service";

@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @RequirePermission("task.review.read")
  @Get("pending")
  pending() {
    return this.reviews.pending();
  }

  @RequirePermission("task.review.approve")
  @Post(":submissionId/approve")
  approve(
    @Req() request: RequestWithContext,
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Headers("idempotency-key") key: string,
  ) {
    return this.reviews.approve(
      request.user!.id,
      request.requestId,
      submissionId,
      requireIdempotencyKey(key),
    );
  }

  @RequirePermission("task.review.reject")
  @Post(":submissionId/reject")
  reject(
    @Req() request: RequestWithContext,
    @Param("submissionId", ParseUUIDPipe) submissionId: string,
    @Headers("idempotency-key") key: string,
    @Body() dto: RejectSubmissionDto,
  ) {
    return this.reviews.reject(
      request.user!.id,
      request.requestId,
      submissionId,
      requireIdempotencyKey(key),
      dto,
    );
  }
}
