-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadSource" ADD VALUE 'mbti';
ALTER TYPE "LeadSource" ADD VALUE 'selfMotivation';

-- Storage bucket for MBTI/Self Motivation result screenshots (Plan 17).
-- Private bucket — objects are only reachable via a signed URL generated
-- server-side for the uploading member, not a public URL. Path convention
-- is "<userId>/<source>.<ext>" (one current file per member per test,
-- overwritten on re-upload), which is what the RLS policy below scopes on.
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-results', 'test-results', false)
ON CONFLICT (id) DO NOTHING;

-- Lets a signed-in member manage (upload/overwrite/read) only objects under
-- their own "<userId>/..." folder — enforced via auth.uid(), since this
-- bucket is written to directly from the browser (Supabase client), not
-- through a Next.js server action.
CREATE POLICY "Members manage own test-result uploads"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'test-results' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'test-results' AND (storage.foldername(name))[1] = auth.uid()::text);
