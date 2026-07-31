-- AlterTable
-- Applicant already has rows (real /join submissions), so this backfills
-- the one existing row with an empty string via a temporary default, then
-- drops the default — the schema itself has no @default, this is only to
-- get past the NOT NULL constraint for pre-existing data.
ALTER TABLE "Applicant" ADD COLUMN "schoolCity" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Applicant" ALTER COLUMN "schoolCity" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MemberIntake" ADD COLUMN "schoolCity" TEXT NOT NULL;
