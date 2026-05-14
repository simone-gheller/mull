-- Add source column to access_keys (MANUAL | CLI)
ALTER TABLE "public"."access_keys" ADD COLUMN "source" VARCHAR(16) NOT NULL DEFAULT 'MANUAL';

-- Create cli_device_codes table for device flow authentication
CREATE TABLE "public"."cli_device_codes" (
    "id" UUID NOT NULL,
    "device_code_hash" VARCHAR(64) NOT NULL,
    "device_name" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "approved_at" TIMESTAMPTZ,
    "approved_by_user_id" UUID,
    "org_id" UUID,
    "consumed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cli_device_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cli_device_codes_device_code_hash_key" ON "public"."cli_device_codes"("device_code_hash");
