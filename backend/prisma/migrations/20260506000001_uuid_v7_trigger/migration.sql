-- UUIDv7 generator: time-ordered UUID compatible with the app's uuidv7() JS library
CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(int8send(floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint) FROM 3)
          FROM 1 FOR 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$$;

-- Replace trigger to use uuid_generate_v7() instead of gen_random_uuid()
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
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );

  INSERT INTO public.organizations (id, name)
  VALUES (new_org_id, org_name);

  INSERT INTO public.user_organizations (user_id, org_id, role)
  VALUES (new_user_id, new_org_id, 'OWNER');

  RETURN new;
END;
$$;
