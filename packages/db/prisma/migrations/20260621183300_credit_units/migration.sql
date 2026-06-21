ALTER TABLE "credit_transactions" ADD COLUMN "amount_units" INTEGER;

UPDATE "credit_transactions"
SET "amount_units" = "amount" * 1000;

ALTER TABLE "credit_transactions" ALTER COLUMN "amount_units" SET NOT NULL;
ALTER TABLE "credit_transactions" DROP COLUMN "amount";
ALTER TABLE "credit_transactions" ADD COLUMN "idempotency_key" TEXT;
CREATE UNIQUE INDEX "credit_transactions_idempotency_key_key"
ON "credit_transactions"("idempotency_key");

ALTER TABLE "generation_jobs" ADD COLUMN "credits_cost_units" INTEGER;

UPDATE "generation_jobs"
SET "credits_cost_units" = "credits_cost" * 1000;

ALTER TABLE "generation_jobs" ALTER COLUMN "credits_cost_units" SET NOT NULL;
ALTER TABLE "generation_jobs" DROP COLUMN "credits_cost";
