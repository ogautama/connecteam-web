-- Storage bucket for the public /join application form's photo uploads
-- (same 5 fields as the member "Isi Data" form). Private bucket — objects
-- are only reachable via a signed URL generated server-side for a leader
-- reviewing the application, never a public URL. Path convention is
-- "<random per-submission id>/<field>.<ext>" — there's no userId to scope
-- by, since the submitter has no account yet.
INSERT INTO storage.buckets (id, name, public)
VALUES ('applicant-intake', 'applicant-intake', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone (signed in or not) can upload — this is the public application
-- form. Accepted tradeoff: no per-submitter identity to rate-limit or scope
-- by, since the whole point is applicants have no account yet. Revisit if
-- this bucket sees abuse (e.g. add a submission-rate check in the server
-- action, which already validates every path is under the same
-- one-time-generated prefix before persisting an Applicant row).
CREATE POLICY "Anyone can submit applicant-intake uploads"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'applicant-intake');

-- Only leaders can read these back — the review screen
-- (src/app/member/admin/add-member) is the only place signed URLs get
-- issued from, and it's already gated by requireRole("leader"); this
-- mirrors that at the storage layer too, since Storage API calls (even
-- createSignedUrl) still go through this table's RLS.
CREATE POLICY "Leaders can view applicant-intake uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applicant-intake'
  AND EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role = 'leader'
  )
);
