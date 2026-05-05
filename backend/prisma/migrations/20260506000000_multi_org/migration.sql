-- CreateTable (must come before data migration INSERT)
CREATE TABLE "user_organizations" (
    "user_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("user_id","org_id")
);

-- CreateIndex
CREATE INDEX "user_organizations_user_id_idx" ON "user_organizations"("user_id");

-- CreateIndex
CREATE INDEX "user_organizations_org_id_idx" ON "user_organizations"("org_id");

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing user/org relationships to join table
INSERT INTO user_organizations (user_id, org_id, role)
SELECT id, organization_id, role FROM users
WHERE organization_id IS NOT NULL;

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_organization_id_fkey";

-- DropIndex
DROP INDEX "users_organization_id_idx";

-- AlterTable: remove organizationId and role from users
ALTER TABLE "users" DROP COLUMN "organization_id",
DROP COLUMN "role";

-- Trigger: auto-create user + org + membership when Supabase creates an auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id uuid := gen_random_uuid();
  new_org_id  uuid := gen_random_uuid();
  org_name    text;
BEGIN
  org_name := COALESCE(
    new.raw_user_meta_data->>'organization_name',
    split_part(new.email, '@', 1) || '''s organization'
  );

  INSERT INTO public.users (id, supabase_id, email, display_name)
  VALUES (
    new_user_id,
    new.id::text,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  INSERT INTO public.organizations (id, name)
  VALUES (new_org_id, org_name);

  INSERT INTO public.user_organizations (user_id, org_id, role)
  VALUES (new_user_id, new_org_id, 'OWNER');

  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
