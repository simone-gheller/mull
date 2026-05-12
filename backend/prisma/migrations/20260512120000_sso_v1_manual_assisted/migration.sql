CREATE TYPE "OrgSsoStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DISABLED');
CREATE TYPE "OrgSsoMode" AS ENUM ('OFF', 'OPTIONAL', 'REQUIRED');

CREATE TABLE "user_auth_accounts" (
  "id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "supabase_id" varchar(255) NOT NULL,
  "provider" varchar(100) NOT NULL,
  "provider_id" varchar(255),
  "sso_provider_id" uuid,
  "email" varchar(255),
  "last_used_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_auth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_sso_connections" (
  "id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "supabase_sso_provider_id" uuid NOT NULL,
  "name" varchar(255) NOT NULL,
  "domains" text[] DEFAULT ARRAY[]::text[],
  "status" "OrgSsoStatus" NOT NULL DEFAULT 'DRAFT',
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "org_sso_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_auth_policies" (
  "org_id" uuid NOT NULL,
  "sso_mode" "OrgSsoMode" NOT NULL DEFAULT 'OFF',
  "allow_password_fallback_for_owners" boolean NOT NULL DEFAULT true,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "org_auth_policies_pkey" PRIMARY KEY ("org_id")
);

CREATE UNIQUE INDEX "user_auth_accounts_supabase_id_key" ON "user_auth_accounts"("supabase_id");
CREATE INDEX "user_auth_accounts_user_id_idx" ON "user_auth_accounts"("user_id");
CREATE INDEX "user_auth_accounts_email_idx" ON "user_auth_accounts"("email");
CREATE INDEX "user_auth_accounts_sso_provider_id_idx" ON "user_auth_accounts"("sso_provider_id");

CREATE UNIQUE INDEX "org_sso_connections_supabase_sso_provider_id_key" ON "org_sso_connections"("supabase_sso_provider_id");
CREATE INDEX "org_sso_connections_org_id_idx" ON "org_sso_connections"("org_id");
CREATE INDEX "org_sso_connections_domains_idx" ON "org_sso_connections" USING GIN ("domains");

ALTER TABLE "user_auth_accounts"
  ADD CONSTRAINT "user_auth_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_sso_connections"
  ADD CONSTRAINT "org_sso_connections_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_auth_policies"
  ADD CONSTRAINT "org_auth_policies_org_id_fkey"
  FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "user_auth_accounts" ("id", "user_id", "supabase_id", "provider", "provider_id", "email")
SELECT public.uuid_generate_v7(), "id", "supabase_id", 'email', "supabase_id", "email"
FROM "users"
ON CONFLICT ("supabase_id") DO NOTHING;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_user_id uuid;
  new_user_id uuid := public.uuid_generate_v7();
  new_org_id  uuid := public.uuid_generate_v7();
  owner_role_id uuid;
  org_name    text;
  provider_name text;
  provider_subject text;
  sso_provider_id uuid;
BEGIN
  SELECT id INTO owner_role_id
  FROM public.roles
  WHERE org_id IS NULL AND key = 'OWNER';

  provider_name := COALESCE(
    new.raw_app_meta_data->>'provider',
    CASE
      WHEN new.raw_app_meta_data ? 'providers' THEN (new.raw_app_meta_data->'providers')->>0
      ELSE 'email'
    END,
    'email'
  );

  provider_subject := COALESCE(new.raw_app_meta_data->>'provider_id', new.id::text);

  IF provider_name LIKE 'sso:%' THEN
    sso_provider_id := replace(provider_name, 'sso:', '')::uuid;
  ELSE
    sso_provider_id := NULL;
  END IF;

  SELECT id INTO target_user_id
  FROM public.users
  WHERE lower(email) = lower(new.email)
  ORDER BY id
  LIMIT 1;

  IF target_user_id IS NULL THEN
    target_user_id := new_user_id;
    org_name := COALESCE(
      new.raw_user_meta_data->>'organization_name',
      split_part(new.email, '@', 1) || '''s organization'
    );

    INSERT INTO public.users (id, supabase_id, email, display_name)
    VALUES (
      target_user_id,
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
    VALUES (target_user_id, new_org_id, owner_role_id);
  END IF;

  INSERT INTO public.user_auth_accounts (
    id,
    user_id,
    supabase_id,
    provider,
    provider_id,
    sso_provider_id,
    email
  )
  VALUES (
    public.uuid_generate_v7(),
    target_user_id,
    new.id::text,
    provider_name,
    provider_subject,
    sso_provider_id,
    new.email
  )
  ON CONFLICT (supabase_id) DO NOTHING;

  RETURN new;
END;
$$;
