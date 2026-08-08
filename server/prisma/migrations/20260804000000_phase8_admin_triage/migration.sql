-- AlterEnum: Add new values to ComplaintStatus enum (idempotent — safe to re-run)
DO $$ BEGIN
  ALTER TYPE "ComplaintStatus" ADD VALUE 'in_progress';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "ComplaintStatus" ADD VALUE 'resolved';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TYPE "ComplaintStatus" ADD VALUE 'rejected';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateEnum: Create Priority enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable: Add triage fields to Complaint table (idempotent)
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "assignedDepartment" TEXT;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "priority" "Priority" NOT NULL DEFAULT 'medium';
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT;
ALTER TABLE "Complaint" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
