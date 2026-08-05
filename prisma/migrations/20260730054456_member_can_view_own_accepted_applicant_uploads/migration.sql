-- Lets a signed-in member read back the photos from their own accepted
-- /join application (src/lib/applicant.ts's getAcceptedApplicantByEmail),
-- so "Isi Data" can show it read-only instead of asking them to upload
-- everything again. There's no per-user folder to scope by here (the
-- bucket is keyed by a random per-submission id, not a userId — the
-- applicant had no account yet at upload time), so this matches the
-- object's exact stored path against the one Applicant row (status
-- 'accepted') whose email matches the requesting user's own verified
-- sign-in email, rather than a folder-prefix check like every other
-- policy in this app.
CREATE POLICY "Members can view their own accepted-applicant uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applicant-intake'
  AND EXISTS (
    SELECT 1
    FROM "Applicant" a
    JOIN "User" u ON u.email = a."activeEmail"
    WHERE u.id = auth.uid()::text
      AND a.status = 'accepted'
      AND name IN (
        a."ktpPhotoKey",
        a."selfiePhotoKey",
        a."familyCardPhotoKey",
        a."savingsPhotoKey",
        a."spousePhotoKey"
      )
  )
);
