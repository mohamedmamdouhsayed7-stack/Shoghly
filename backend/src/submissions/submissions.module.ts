import { Module } from "@nestjs/common";
import { IdempotencyService } from "../common/idempotency.service";
import { QuotaReservationService } from "./quota-reservation.service";
import { SubmissionsController } from "./submissions.controller";
import { SubmissionsService } from "./submissions.service";

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, QuotaReservationService, IdempotencyService],
})
export class SubmissionsModule {}
