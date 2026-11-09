-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "task_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "submission_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "quota_source" AS ENUM ('FREE_LIFETIME', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "reward_transaction_type" AS ENUM ('TASK_APPROVAL', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "idempotency_status" AS ENUM ('STARTED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_by_id" UUID NOT NULL,
    "status" "task_status" NOT NULL DEFAULT 'DRAFT',
    "expires_at" TIMESTAMPTZ(6),
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "summary" VARCHAR(220) NOT NULL,
    "description" VARCHAR(4000) NOT NULL,
    "external_url" VARCHAR(2048) NOT NULL,
    "instructions" VARCHAR(4000) NOT NULL,
    "reward_base_iqd" INTEGER NOT NULL DEFAULT 250,
    "evidence_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "task_version" INTEGER NOT NULL,
    "worker_id" UUID NOT NULL,
    "status" "submission_status" NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMPTZ(6),
    "reviewed_by_id" UUID,
    "rejection_reason" VARCHAR(1000),
    "multiplier_policy" VARCHAR(16),
    "multiplier_snapshot" DECIMAL(12,4),
    "subscription_snapshot_id" UUID,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "text_value" VARCHAR(2000),
    "url_value" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "status" "subscription_status" NOT NULL DEFAULT 'PENDING',
    "reward_multiplier" DECIMAL(12,4) NOT NULL,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "verified_at" TIMESTAMPTZ(6),
    "source_reference" VARCHAR(200),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quota_grants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" "quota_source" NOT NULL,
    "source_reference" VARCHAR(200),
    "granted_units" INTEGER NOT NULL,
    "reserved_units" INTEGER NOT NULL DEFAULT 0,
    "consumed_units" INTEGER NOT NULL DEFAULT 0,
    "expired_units" INTEGER NOT NULL DEFAULT 0,
    "revoked_units" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subscription_id" UUID,

    CONSTRAINT "quota_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "quota_grant_id" UUID NOT NULL,
    "status" "reservation_status" NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_gates" (
    "user_id" UUID NOT NULL,
    "last_approved_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "approval_gates_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "reward_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "subscription_id" UUID,
    "type" "reward_transaction_type" NOT NULL,
    "amount_iqd" INTEGER NOT NULL,
    "base_reward_iqd" INTEGER NOT NULL,
    "multiplier" DECIMAL(12,4) NOT NULL,
    "idempotency_key" VARCHAR(200) NOT NULL,
    "original_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "target_id" VARCHAR(100),
    "request_id" VARCHAR(100) NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" VARCHAR(80) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "key" VARCHAR(200) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" "idempotency_status" NOT NULL DEFAULT 'STARTED',
    "response" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_status_created_at_idx" ON "tasks"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tasks_expires_at_idx" ON "tasks"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "task_versions_task_id_version_key" ON "task_versions"("task_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "task_versions_task_id_id_key" ON "task_versions"("task_id", "id");

-- CreateIndex
CREATE INDEX "submissions_status_submitted_at_idx" ON "submissions"("status", "submitted_at");

-- CreateIndex
CREATE INDEX "submissions_worker_id_submitted_at_idx" ON "submissions"("worker_id", "submitted_at" DESC);

-- CreateIndex
CREATE INDEX "submissions_task_id_worker_id_idx" ON "submissions"("task_id", "worker_id");

-- CreateIndex
CREATE INDEX "submission_evidence_submission_id_created_at_idx" ON "submission_evidence"("submission_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_source_reference_key" ON "subscriptions"("source_reference");

-- CreateIndex
CREATE INDEX "subscriptions_user_id_status_ends_at_idx" ON "subscriptions"("user_id", "status", "ends_at");

-- CreateIndex
CREATE INDEX "quota_grants_user_id_source_expires_at_idx" ON "quota_grants"("user_id", "source", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "quota_grants_user_id_source_source_reference_key" ON "quota_grants"("user_id", "source", "source_reference");

-- CreateIndex
CREATE UNIQUE INDEX "reservations_submission_id_key" ON "reservations"("submission_id");

-- CreateIndex
CREATE INDEX "reservations_quota_grant_id_status_idx" ON "reservations"("quota_grant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reward_transactions_idempotency_key_key" ON "reward_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "reward_transactions_user_id_created_at_idx" ON "reward_transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_created_at_idx" ON "audit_log"("target_type", "target_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idempotency_records_created_at_idx" ON "idempotency_records"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_actor_id_key_key" ON "idempotency_records"("actor_id", "key");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_versions" ADD CONSTRAINT "task_versions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_task_id_task_version_fkey" FOREIGN KEY ("task_id", "task_version") REFERENCES "task_versions"("task_id", "version") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_subscription_snapshot_id_fkey" FOREIGN KEY ("subscription_snapshot_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_evidence" ADD CONSTRAINT "submission_evidence_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_grants" ADD CONSTRAINT "quota_grants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quota_grants" ADD CONSTRAINT "quota_grants_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_quota_grant_id_fkey" FOREIGN KEY ("quota_grant_id") REFERENCES "quota_grants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_gates" ADD CONSTRAINT "approval_gates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_original_id_fkey" FOREIGN KEY ("original_id") REFERENCES "reward_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants that are not expressible in the Prisma schema.
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_current_version_positive" CHECK ("current_version" > 0);

ALTER TABLE "task_versions"
  ADD CONSTRAINT "task_versions_reward_is_confirmed_base" CHECK ("reward_base_iqd" = 250),
  ADD CONSTRAINT "task_versions_text_is_trimmed" CHECK (
    char_length(btrim("title")) BETWEEN 2 AND 100 AND
    char_length(btrim("summary")) BETWEEN 2 AND 220 AND
    char_length(btrim("description")) >= 2 AND
    char_length(btrim("instructions")) >= 2
  ),
  ADD CONSTRAINT "task_versions_external_url_is_https" CHECK ("external_url" LIKE 'https://%');

ALTER TABLE "submissions"
  ADD CONSTRAINT "submissions_reviewer_state_consistent" CHECK (
    ("status" = 'PENDING' AND "reviewed_at" IS NULL AND "reviewed_by_id" IS NULL AND "rejection_reason" IS NULL)
    OR ("status" = 'APPROVED' AND "reviewed_at" IS NOT NULL AND "reviewed_by_id" IS NOT NULL AND "rejection_reason" IS NULL)
    OR ("status" = 'REJECTED' AND "reviewed_at" IS NOT NULL AND "reviewed_by_id" IS NOT NULL AND char_length(btrim("rejection_reason")) > 0)
  ),
  ADD CONSTRAINT "submissions_multiplier_policy_valid" CHECK (
    "multiplier_policy" IS NULL OR "multiplier_policy" IN ('submission', 'approval')
  ),
  ADD CONSTRAINT "submissions_multiplier_snapshot_valid" CHECK (
    "multiplier_snapshot" IS NULL OR "multiplier_snapshot" > 0
  );

-- Rejections may be retried; at most one pending or approved attempt is active per worker/task.
CREATE UNIQUE INDEX "submissions_one_open_or_approved_per_worker_task"
  ON "submissions" ("worker_id", "task_id")
  WHERE "status" IN ('PENDING', 'APPROVED');

ALTER TABLE "submission_evidence"
  ADD CONSTRAINT "submission_evidence_kind_valid" CHECK (
    ("kind" = 'TEXT' AND "text_value" IS NOT NULL AND "url_value" IS NULL)
    OR ("kind" = 'URL' AND "url_value" IS NOT NULL AND "text_value" IS NULL AND "url_value" LIKE 'https://%')
  );

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_multiplier_positive" CHECK ("reward_multiplier" > 0),
  ADD CONSTRAINT "subscriptions_time_range_valid" CHECK (
    "starts_at" IS NULL OR "ends_at" IS NULL OR "ends_at" > "starts_at"
  );

ALTER TABLE "quota_grants"
  ADD CONSTRAINT "quota_grants_counts_nonnegative" CHECK (
    "granted_units" > 0 AND "reserved_units" >= 0 AND "consumed_units" >= 0 AND
    "expired_units" >= 0 AND "revoked_units" >= 0
  ),
  ADD CONSTRAINT "quota_grants_reconcile" CHECK (
    "reserved_units" + "consumed_units" + "expired_units" + "revoked_units" <= "granted_units"
  ),
  ADD CONSTRAINT "quota_grants_source_valid" CHECK (
    ("source" = 'FREE_LIFETIME' AND "granted_units" = 5 AND "source_reference" IS NULL AND "subscription_id" IS NULL AND "expires_at" IS NULL)
    OR ("source" = 'SUBSCRIPTION' AND "subscription_id" IS NOT NULL)
  );

CREATE UNIQUE INDEX "quota_grants_one_free_lifetime_per_user"
  ON "quota_grants" ("user_id") WHERE "source" = 'FREE_LIFETIME';

ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_resolution_consistent" CHECK (
    ("status" = 'RESERVED' AND "resolved_at" IS NULL)
    OR ("status" IN ('CONSUMED', 'RELEASED') AND "resolved_at" IS NOT NULL)
  );

CREATE UNIQUE INDEX "reward_transactions_one_task_approval_per_submission"
  ON "reward_transactions" ("submission_id") WHERE "type" = 'TASK_APPROVAL';

ALTER TABLE "reward_transactions"
  ADD CONSTRAINT "reward_transactions_base_is_confirmed" CHECK ("base_reward_iqd" = 250),
  ADD CONSTRAINT "reward_transactions_multiplier_positive" CHECK ("multiplier" > 0),
  ADD CONSTRAINT "reward_transactions_amount_matches_formula" CHECK (
    ("type" = 'TASK_APPROVAL' AND "amount_iqd" > 0 AND "amount_iqd"::numeric = "base_reward_iqd"::numeric * "multiplier")
    OR ("type" = 'REVERSAL' AND "amount_iqd" < 0 AND "original_id" IS NOT NULL)
    OR ("type" = 'ADJUSTMENT' AND "amount_iqd" <> 0)
  );

CREATE UNIQUE INDEX "reward_transactions_one_reversal_per_original"
  ON "reward_transactions" ("original_id") WHERE "type" = 'REVERSAL';

CREATE OR REPLACE FUNCTION "reject_immutable_row_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'This record is append-only';
END;
$$;

CREATE TRIGGER "reward_transactions_append_only"
  BEFORE UPDATE OR DELETE ON "reward_transactions"
  FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();
CREATE TRIGGER "reward_transactions_no_truncate"
  BEFORE TRUNCATE ON "reward_transactions"
  FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_row_change"();
CREATE TRIGGER "audit_log_append_only"
  BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION "reject_immutable_row_change"();
CREATE TRIGGER "audit_log_no_truncate"
  BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "reject_immutable_row_change"();

CREATE OR REPLACE FUNCTION "enforce_submission_review_transition"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  task_creator uuid;
  last_approval timestamptz;
BEGIN
  IF OLD."status" <> 'PENDING' OR NEW."status" NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid submission state transition';
  END IF;
  SELECT "created_by_id" INTO task_creator FROM "tasks" WHERE "id" = NEW."task_id";
  IF NEW."reviewed_by_id" = NEW."worker_id" OR NEW."reviewed_by_id" = task_creator THEN
    RAISE EXCEPTION 'Reviewer cannot review their own submission or task';
  END IF;
  IF NEW."status" = 'APPROVED' THEN
    INSERT INTO "approval_gates" ("user_id", "updated_at")
    VALUES (NEW."worker_id", now()) ON CONFLICT ("user_id") DO NOTHING;
    SELECT "last_approved_at" INTO last_approval
      FROM "approval_gates" WHERE "user_id" = NEW."worker_id" FOR UPDATE;
    IF last_approval IS NOT NULL AND NEW."reviewed_at" < last_approval + interval '24 hours' THEN
      RAISE EXCEPTION 'Worker approval cooldown is active';
    END IF;
    UPDATE "approval_gates"
      SET "last_approved_at" = NEW."reviewed_at", "updated_at" = now()
      WHERE "user_id" = NEW."worker_id";
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "submissions_review_transition_guard"
  BEFORE UPDATE OF "status" ON "submissions"
  FOR EACH ROW WHEN (OLD."status" IS DISTINCT FROM NEW."status")
  EXECUTE FUNCTION "enforce_submission_review_transition"();

