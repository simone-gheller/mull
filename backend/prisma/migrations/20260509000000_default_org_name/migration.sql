-- Update handle_new_user trigger:
-- - Reverts default org name to '<username>''s organization' (works for both email and Google OAuth
--   since Supabase always populates auth.users.email, e.g. john@gmail.com → "john's organization")
-- - Adds support for Google's 'full_name' metadata field as display_name fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_user_id uuid := public.uuid_generate_v7();
  new_org_id  uuid := public.uuid_generate_v7();
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
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  );

  INSERT INTO public.organizations (id, name)
  VALUES (new_org_id, org_name);

  INSERT INTO public.user_organizations (user_id, org_id, role)
  VALUES (new_user_id, new_org_id, 'OWNER');

  RETURN new;
END;
$$;
