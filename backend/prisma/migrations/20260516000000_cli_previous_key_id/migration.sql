-- Add previous_key_id to cli_device_codes for exact token revocation on re-login
ALTER TABLE "public"."cli_device_codes" ADD COLUMN "previous_key_id" UUID;
