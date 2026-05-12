CREATE TYPE "RoleKind" AS ENUM ('SYSTEM', 'CUSTOM');
CREATE TYPE "EnvironmentTier" AS ENUM ('DEVELOPMENT', 'STAGING', 'PRODUCTION', 'CUSTOM');

CREATE TABLE "roles" (
  "id" UUID NOT NULL,
  "org_id" UUID,
  "key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "kind" "RoleKind" NOT NULL DEFAULT 'CUSTOM',
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "created_by_user_id" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "roles_org_id_key_key" ON "roles"("org_id", "key");
CREATE UNIQUE INDEX "roles_system_key_key" ON "roles"("key") WHERE "org_id" IS NULL;
CREATE INDEX "roles_org_id_idx" ON "roles"("org_id");
CREATE INDEX "roles_created_by_user_id_idx" ON "roles"("created_by_user_id");

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "roles"
  ADD CONSTRAINT "roles_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "roles" ("id", "org_id", "key", "name", "description", "kind", "permissions")
VALUES
  (
    public.uuid_generate_v7(),
    NULL,
    'OWNER',
    'Owner',
    'Full organization ownership, including billing and deletion.',
    'SYSTEM',
    '[
      {"scope":"org:read"},{"scope":"org:update"},{"scope":"org:delete"},
      {"scope":"billing:manage"},
      {"scope":"members:read"},{"scope":"members:manage"},
      {"scope":"roles:read"},{"scope":"roles:manage"},
      {"scope":"audit:read"},
      {"scope":"apps:read"},{"scope":"apps:manage"},
      {"scope":"environments:read"},{"scope":"environments:manage"},
      {"scope":"parameters:read"},{"scope":"parameters:write"},{"scope":"parameters:delete"},
      {"scope":"config:read"},{"scope":"config:reveal"},{"scope":"config:write"},
      {"scope":"access_keys:read"},{"scope":"access_keys:manage"}
    ]'::jsonb
  ),
  (
    public.uuid_generate_v7(),
    NULL,
    'ADMIN',
    'Admin',
    'Operational administration without billing or organization deletion.',
    'SYSTEM',
    '[
      {"scope":"org:read"},{"scope":"org:update"},
      {"scope":"members:read"},{"scope":"members:manage"},
      {"scope":"roles:read"},{"scope":"roles:manage"},
      {"scope":"audit:read"},
      {"scope":"apps:read"},{"scope":"apps:manage"},
      {"scope":"environments:read"},{"scope":"environments:manage"},
      {"scope":"parameters:read"},{"scope":"parameters:write"},{"scope":"parameters:delete"},
      {"scope":"config:read"},{"scope":"config:reveal"},{"scope":"config:write"},
      {"scope":"access_keys:read"},{"scope":"access_keys:manage"}
    ]'::jsonb
  ),
  (
    public.uuid_generate_v7(),
    NULL,
    'DEVELOPER',
    'Developer',
    'Can work with app config, but cannot reveal or write protected environments.',
    'SYSTEM',
    '[
      {"scope":"org:read"},
      {"scope":"apps:read"},
      {"scope":"environments:read"},
      {"scope":"parameters:read"},
      {"scope":"parameters:write"},
      {"scope":"config:read"},
      {"scope":"config:reveal","conditions":{"environmentProtected":false,"environmentTiers":["DEVELOPMENT","STAGING","CUSTOM"]}},
      {"scope":"config:write","conditions":{"environmentProtected":false,"environmentTiers":["DEVELOPMENT","STAGING","CUSTOM"]}}
    ]'::jsonb
  ),
  (
    public.uuid_generate_v7(),
    NULL,
    'VIEWER',
    'Viewer',
    'Read-only access to metadata and non-protected config values.',
    'SYSTEM',
    '[
      {"scope":"org:read"},
      {"scope":"apps:read"},
      {"scope":"environments:read"},
      {"scope":"parameters:read"},
      {"scope":"config:read"},
      {"scope":"config:reveal","conditions":{"environmentProtected":false,"environmentTiers":["DEVELOPMENT","STAGING","CUSTOM"]}}
    ]'::jsonb
  );

ALTER TABLE "environments" ADD COLUMN "tier" "EnvironmentTier" NOT NULL DEFAULT 'CUSTOM';
ALTER TABLE "environments" ADD COLUMN "protected" BOOLEAN NOT NULL DEFAULT false;
UPDATE "environments" SET "protected" = COALESCE("is_secret", false);
ALTER TABLE "environments" DROP COLUMN "is_secret";

ALTER TABLE "parameters" DROP COLUMN "is_secret";

ALTER TABLE "user_organizations" ADD COLUMN "role_id" UUID;
UPDATE "user_organizations" uo
SET "role_id" = roles.id
FROM "roles"
WHERE roles."org_id" IS NULL
  AND roles."key" = CASE
    WHEN uo."role"::text = 'OWNER' THEN 'OWNER'
    WHEN uo."role"::text = 'ADMIN' THEN 'ADMIN'
    ELSE 'DEVELOPER'
  END;
ALTER TABLE "user_organizations" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "user_organizations" DROP COLUMN "role";
CREATE INDEX "user_organizations_role_id_idx" ON "user_organizations"("role_id");
ALTER TABLE "user_organizations"
  ADD CONSTRAINT "user_organizations_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "org_invites" ADD COLUMN "role_id" UUID;
UPDATE "org_invites" invites
SET "role_id" = roles.id
FROM "roles"
WHERE roles."org_id" IS NULL
  AND roles."key" = CASE
    WHEN invites."role"::text = 'OWNER' THEN 'OWNER'
    WHEN invites."role"::text = 'ADMIN' THEN 'ADMIN'
    ELSE 'DEVELOPER'
  END;
ALTER TABLE "org_invites" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "org_invites" DROP COLUMN "role";
CREATE INDEX "org_invites_role_id_idx" ON "org_invites"("role_id");
ALTER TABLE "org_invites"
  ADD CONSTRAINT "org_invites_role_id_fkey"
  FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "UserRole";

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id uuid := public.uuid_generate_v7();
  new_org_id  uuid := public.uuid_generate_v7();
  owner_role_id uuid;
  org_name    text;
BEGIN
  SELECT id INTO owner_role_id
  FROM public.roles
  WHERE org_id IS NULL AND key = 'OWNER';

  org_name := COALESCE(
    new.raw_user_meta_data->>'organization_name',
    split_part(new.email, '@', 1) || '''s organization'
  );

  INSERT INTO public.users (id, supabase_id, email, display_name)
  VALUES (
    new_user_id,
    new.id::text,
    new.email,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  );

  INSERT INTO public.organizations (id, name)
  VALUES (new_org_id, org_name);

  INSERT INTO public.user_organizations (user_id, org_id, role_id)
  VALUES (new_user_id, new_org_id, owner_role_id);

  RETURN new;
END;
$$;
