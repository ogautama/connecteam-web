-- Plan 16: attribute every Lead to a User in the recruitment tree.
--
-- ownerId ends up NOT NULL (every write path — signed-in save or
-- resolveRecruiter's ref/root fallback — resolves an owner from here on),
-- so the 7 existing rows need backfilling before the constraint can land:
--
--   1. A row whose `contact` matches a User's email was that member's own
--      auto-saved result (DISC, or an MBTI/Self Motivation upload) — they
--      are both its owner and its taker.
--   2. Everything else (prospect submissions predating attribution, plus
--      the known `ZZ TEST - hapus aja` row) falls back to the root leader,
--      same behaviour resolveRecruiter already has for a missing/unknown
--      referral code. Deleting the test row is a data chore for Studio,
--      not this migration.
--
-- Step 1 must run before step 2, or the email-matched rows would already
-- be claimed by root by the time the match runs.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "takerUserId" TEXT;

-- Backfill 1: member's own result (contact = their account email).
UPDATE "Lead" l
SET "ownerId" = u.id,
    "takerUserId" = u.id
FROM "User" u
WHERE u.email = l.contact
  AND l."ownerId" IS NULL;

-- Backfill 2: everything left over falls back to the root leader
-- (recruiterId IS NULL), same as resolveRecruiter's own fallback.
UPDATE "Lead"
SET "ownerId" = (SELECT id FROM "User" WHERE "recruiterId" IS NULL LIMIT 1)
WHERE "ownerId" IS NULL;

-- AlterTable
ALTER TABLE "Lead" ALTER COLUMN "ownerId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Lead_source_ownerId_createdAt_idx" ON "Lead"("source", "ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_takerUserId_fkey" FOREIGN KEY ("takerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
