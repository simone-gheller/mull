ALTER TABLE "billing_events" ADD COLUMN "org_id" UUID;

CREATE INDEX "billing_events_org_id_idx" ON "billing_events"("org_id");

ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
