import { SetMetadata } from "@nestjs/common";

export const REQUIRED_PERMISSION = "shoghly:required-permission";
export type BackendPermission =
  | "task.manage.read"
  | "task.manage.write"
  | "task.manage.publish"
  | "task.review.read"
  | "task.review.approve"
  | "task.review.reject"
  | "subscription.payment.read"
  | "financial.settings.read"
  | "audit.read";

export const RequirePermission = (permission: BackendPermission) =>
  SetMetadata(REQUIRED_PERMISSION, permission);
