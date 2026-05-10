CREATE TYPE "AuditActorType" AS ENUM ('USER', 'API_TOKEN', 'SYSTEM', 'ANONYMOUS');
CREATE TYPE "AuditOutcome" AS ENUM ('SUCCESS', 'DENIED', 'FAILURE');

CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_type" "AuditActorType" NOT NULL DEFAULT 'USER',
    "actor_display" VARCHAR(255),
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255),
    "resource_label" VARCHAR(255),
    "outcome" "AuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "request_id" VARCHAR(255),
    "ip" VARCHAR(255),
    "user_agent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_org_id_created_at_idx" ON "audit_events"("org_id", "created_at");
CREATE INDEX "audit_events_org_id_action_created_at_idx" ON "audit_events"("org_id", "action", "created_at");
CREATE INDEX "audit_events_org_id_resource_type_created_at_idx" ON "audit_events"("org_id", "resource_type", "created_at");
CREATE INDEX "audit_events_actor_user_id_created_at_idx" ON "audit_events"("actor_user_id", "created_at");

ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
