-- Rename product plans to match the public billing model.
ALTER TYPE "OrganizationPlan" RENAME VALUE 'STARTER' TO 'FREE';
ALTER TYPE "OrganizationPlan" RENAME VALUE 'PRO' TO 'TEAM';
ALTER TYPE "OrganizationPlan" ADD VALUE IF NOT EXISTS 'BUSINESS' BEFORE 'ENTERPRISE';

ALTER TABLE "organizations" ALTER COLUMN "plan" SET DEFAULT 'FREE';

CREATE TYPE "BillingProvider" AS ENUM ('PADDLE', 'STRIPE');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');

CREATE TABLE "billing_customers" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_customer_id" VARCHAR(255) NOT NULL,
    "billing_email" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_subscriptions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "provider_subscription_id" VARCHAR(255) NOT NULL,
    "provider_price_id" VARCHAR(255) NOT NULL,
    "plan" "OrganizationPlan" NOT NULL,
    "status" "BillingSubscriptionStatus" NOT NULL,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "billing_events" (
    "provider_event_id" VARCHAR(255) NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("provider_event_id")
);

CREATE UNIQUE INDEX "billing_customers_org_id_key" ON "billing_customers"("org_id");
CREATE UNIQUE INDEX "billing_customers_provider_provider_customer_id_key" ON "billing_customers"("provider", "provider_customer_id");
CREATE INDEX "billing_customers_org_id_idx" ON "billing_customers"("org_id");

CREATE UNIQUE INDEX "billing_subscriptions_org_id_key" ON "billing_subscriptions"("org_id");
CREATE UNIQUE INDEX "billing_subscriptions_provider_provider_subscription_id_key" ON "billing_subscriptions"("provider", "provider_subscription_id");
CREATE INDEX "billing_subscriptions_org_id_idx" ON "billing_subscriptions"("org_id");

CREATE INDEX "billing_events_provider_type_idx" ON "billing_events"("provider", "type");

ALTER TABLE "billing_customers" ADD CONSTRAINT "billing_customers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION public.audit_retention_expires_at(
  p_plan "OrganizationPlan",
  p_created_at timestamp without time zone
)
RETURNS timestamp without time zone
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan::text
    WHEN 'FREE' THEN p_created_at + INTERVAL '7 days'
    WHEN 'TEAM' THEN p_created_at + INTERVAL '90 days'
    WHEN 'BUSINESS' THEN p_created_at + INTERVAL '365 days'
    WHEN 'ENTERPRISE' THEN NULL
    ELSE p_created_at + INTERVAL '7 days'
  END
$$;
