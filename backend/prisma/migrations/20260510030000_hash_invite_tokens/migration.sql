CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE "org_invites" ADD COLUMN "token_hash" VARCHAR(64);

UPDATE "org_invites"
SET "token_hash" = encode(extensions.digest("token"::text, 'sha256'), 'hex')
WHERE "token_hash" IS NULL;

ALTER TABLE "org_invites" ALTER COLUMN "token_hash" SET NOT NULL;

DROP INDEX IF EXISTS "org_invites_token_idx";
DROP INDEX IF EXISTS "org_invites_token_key";

ALTER TABLE "org_invites" DROP COLUMN "token";

CREATE UNIQUE INDEX "org_invites_token_hash_key" ON "org_invites"("token_hash");
CREATE INDEX "org_invites_token_hash_idx" ON "org_invites"("token_hash");
