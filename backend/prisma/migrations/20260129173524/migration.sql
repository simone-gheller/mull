-- CreateTable
CREATE TABLE "organizations" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" BIGSERIAL NOT NULL,
    "org_id" BIGINT NOT NULL,
    "parent_id" BIGINT,
    "name" VARCHAR(255) NOT NULL,
    "ancestors" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    "depth" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environments" (
    "id" BIGSERIAL NOT NULL,
    "org_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameters" (
    "id" BIGSERIAL NOT NULL,
    "app_id" BIGINT NOT NULL,
    "key" VARCHAR(255) NOT NULL,

    CONSTRAINT "parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_values" (
    "id" BIGSERIAL NOT NULL,
    "parameter_id" BIGINT NOT NULL,
    "environment_id" BIGINT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "parameter_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apps_org_id_idx" ON "apps"("org_id");

-- CreateIndex
CREATE INDEX "apps_parent_id_idx" ON "apps"("parent_id");

-- CreateIndex
CREATE INDEX "apps_ancestors_idx" ON "apps" USING GIN ("ancestors");

-- CreateIndex
CREATE UNIQUE INDEX "apps_org_id_name_key" ON "apps"("org_id", "name");

-- CreateIndex
CREATE INDEX "environments_org_id_idx" ON "environments"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "environments_org_id_name_key" ON "environments"("org_id", "name");

-- CreateIndex
CREATE INDEX "parameters_app_id_idx" ON "parameters"("app_id");

-- CreateIndex
CREATE UNIQUE INDEX "parameters_app_id_key_key" ON "parameters"("app_id", "key");

-- CreateIndex
CREATE INDEX "parameter_values_parameter_id_idx" ON "parameter_values"("parameter_id");

-- CreateIndex
CREATE INDEX "parameter_values_environment_id_idx" ON "parameter_values"("environment_id");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_values_parameter_id_environment_id_key" ON "parameter_values"("parameter_id", "environment_id");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "environments" ADD CONSTRAINT "environments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameters" ADD CONSTRAINT "parameters_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_values" ADD CONSTRAINT "parameter_values_environment_id_fkey" FOREIGN KEY ("environment_id") REFERENCES "environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
