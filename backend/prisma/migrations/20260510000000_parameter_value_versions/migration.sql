-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "ParameterValueChangeType" AS ENUM ('UPDATE', 'CLEAR', 'ROLLBACK');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "plan" "OrganizationPlan" NOT NULL DEFAULT 'STARTER';

-- CreateTable
CREATE TABLE "parameter_value_versions" (
    "id" UUID NOT NULL,
    "parameter_value_id" UUID NOT NULL,
    "parameter_id" UUID NOT NULL,
    "environment_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "change_type" "ParameterValueChangeType" NOT NULL,
    "rolled_back_from_version_id" UUID,
    "value_ciphertext" BYTEA NOT NULL,
    "value_iv" BYTEA NOT NULL,
    "value_tag" BYTEA NOT NULL,
    "dek_ciphertext" BYTEA NOT NULL,
    "dek_iv" BYTEA NOT NULL,
    "dek_tag" BYTEA NOT NULL,
    "kek_version" INTEGER NOT NULL,
    "encryption_alg" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "encrypted_at" TIMESTAMP(3) NOT NULL,
    "is_set" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_value_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parameter_value_versions_parameter_value_id_version_number_key" ON "parameter_value_versions"("parameter_value_id", "version_number");

-- CreateIndex
CREATE INDEX "parameter_value_versions_parameter_value_id_created_at_idx" ON "parameter_value_versions"("parameter_value_id", "created_at");

-- CreateIndex
CREATE INDEX "parameter_value_versions_parameter_id_environment_id_idx" ON "parameter_value_versions"("parameter_id", "environment_id");

-- AddForeignKey
ALTER TABLE "parameter_value_versions" ADD CONSTRAINT "parameter_value_versions_parameter_value_id_fkey" FOREIGN KEY ("parameter_value_id") REFERENCES "parameter_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_value_versions" ADD CONSTRAINT "parameter_value_versions_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_value_versions" ADD CONSTRAINT "parameter_value_versions_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_value_versions" ADD CONSTRAINT "parameter_value_versions_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_value_versions" ADD CONSTRAINT "parameter_value_versions_rolled_back_from_version_id_fkey" FOREIGN KEY ("rolled_back_from_version_id") REFERENCES "parameter_value_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
