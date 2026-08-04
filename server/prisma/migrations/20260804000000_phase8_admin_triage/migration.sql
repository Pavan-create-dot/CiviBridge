-- AlterEnum: Add new values to ComplaintStatus enum
ALTER TYPE "ComplaintStatus" ADD VALUE 'in_progress';
ALTER TYPE "ComplaintStatus" ADD VALUE 'resolved';
ALTER TYPE "ComplaintStatus" ADD VALUE 'rejected';

-- CreateEnum: Create Priority enum
CREATE TYPE "Priority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- AlterTable: Add triage fields to Complaint table
ALTER TABLE "Complaint" ADD COLUMN "assignedDepartment" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "priority" "Priority" NOT NULL DEFAULT 'medium';
ALTER TABLE "Complaint" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "Complaint" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
