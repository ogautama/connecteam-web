-- Fixes "permission denied for table Applicant", hit by real /join
-- submissions right after the previous migration shipped. Root cause: the
-- "Members can view their own accepted-applicant uploads" policy's USING
-- clause queried "Applicant"/"User" directly, and Postgres must be able to
-- evaluate that expression for *any* role that touches storage.objects on
-- this bucket — including anon, uploading during a public /join submission
-- (upload({ upsert: true }) does an existence check, which is enough to
-- trigger policy evaluation even though the row was never going to match).
-- anon/authenticated were never granted SELECT on "Applicant" or "User" (no
-- RLS exists on either table — this app doesn't expose them through
-- PostgREST at all), so evaluating the subquery failed outright.
--
-- Granting anon/authenticated SELECT on those tables would fix the error
-- but isn't the right fix — with no RLS on either table, that grant would
-- expose every row to any anonymous request via Supabase's REST API. A
-- SECURITY DEFINER function (same pattern already used by
-- handle_new_auth_user in 20260720182734_init_supabase_auth) runs with the
-- function owner's privileges instead of the caller's, so the check can
-- read both tables without granting the calling role anything.
DROP POLICY IF EXISTS "Members can view their own accepted-applicant uploads" ON storage.objects;

CREATE OR REPLACE FUNCTION public.member_owns_accepted_applicant_photo(object_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "Applicant" a
    JOIN "User" u ON u.email = a."activeEmail"
    WHERE u.id = auth.uid()::text
      AND a.status = 'accepted'
      AND object_name IN (
        a."ktpPhotoKey",
        a."selfiePhotoKey",
        a."familyCardPhotoKey",
        a."savingsPhotoKey",
        a."spousePhotoKey"
      )
  );
$$;

CREATE POLICY "Members can view their own accepted-applicant uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applicant-intake'
  AND public.member_owns_accepted_applicant_photo(name)
);
