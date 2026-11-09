import { Module } from "@nestjs/common";
import { QuotaReservationService } from "../submissions/quota-reservation.service";
import { IdempotencyService } from "../common/idempotency.service";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService, QuotaReservationService, IdempotencyService],
})
export class ReviewsModule {}
