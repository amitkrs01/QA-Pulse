-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "DetailedStatus" AS ENUM ('NOT_STARTED', 'TC_WRITING_IN_PROGRESS', 'TC_REVIEW_PENDING', 'READY_FOR_EXECUTION', 'EXECUTION_IN_PROGRESS', 'BLOCKED', 'FAILED', 'PASSED', 'READY_FOR_RETEST', 'RETEST_IN_PROGRESS', 'RETEST_FAILED', 'RETEST_PASSED', 'DONE', 'NA');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('PREPARATION', 'EXECUTION', 'OUTCOME', 'RETEST', 'CLOSURE', 'NA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "be_detailed_status" "DetailedStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "be_phase" "Phase" NOT NULL DEFAULT 'PREPARATION',
    "fe_detailed_status" "DetailedStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "fe_phase" "Phase" NOT NULL DEFAULT 'PREPARATION',
    "overall_phase" "Phase" NOT NULL DEFAULT 'PREPARATION',
    "owner_id" TEXT,
    "remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_log" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "field_changed" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_log" ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
