CREATE TYPE "IdentityType" AS ENUM ('USER', 'SERVICE');

CREATE TABLE "identities" (
  "id" UUID NOT NULL,
  "org_id" UUID NOT NULL,
  "type" "IdentityType" NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "owner_user_id" UUID,
  "disabled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "access_keys" (
  "id" UUID NOT NULL,
  "identity_id" UUID NOT NULL,
  "created_by_user_id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "token_hash" VARCHAR(64) NOT NULL,
  "token_prefix" VARCHAR(128) NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "app_id" UUID,
  "environment_id" UUID,
  "expires_at" TIMESTAMP(3),
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "access_keys_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "identities_org_id_idx" ON "identities"("org_id");
CREATE INDEX "identities_owner_user_id_idx" ON "identities"("owner_user_id");

CREATE UNIQUE INDEX "access_keys_token_hash_key" ON "access_keys"("token_hash");
CREATE INDEX "access_keys_identity_id_idx" ON "access_keys"("identity_id");
CREATE INDEX "access_keys_created_by_user_id_idx" ON "access_keys"("created_by_user_id");
CREATE INDEX "access_keys_app_id_idx" ON "access_keys"("app_id");
CREATE INDEX "access_keys_environment_id_idx" ON "access_keys"("environment_id");
CREATE INDEX "access_keys_token_hash_idx" ON "access_keys"("token_hash");

ALTER TABLE "identities"
  ADD CONSTRAINT "identities_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "identities"
  ADD CONSTRAINT "identities_owner_user_id_fkey"
  FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "access_keys"
  ADD CONSTRAINT "access_keys_identity_id_fkey"
  FOREIGN KEY ("identity_id") REFERENCES "identities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "access_keys"
  ADD CONSTRAINT "access_keys_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "access_keys"
  ADD CONSTRAINT "access_keys_app_id_fkey"
  FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "access_keys"
  ADD CONSTRAINT "access_keys_environment_id_fkey"
  FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
