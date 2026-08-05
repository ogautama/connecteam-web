-- Fixes "permission denied for table User" (42501), hit by every member who
-- saves the "Isi Data" form. Exactly the same root cause as
-- 20260730060108_fix_applicant_intake_select_policy_security_definer, in the
-- sibling policy that migration left alone: "Leaders can view
-- applicant-intake uploads" queries "User" directly in its USING clause.
--
-- Postgres checks table privileges for every relation a query references,
-- so the check on "User" happens whether or not the `bucket_id =
-- 'applicant-intake'` guard would ever let that subquery run. The blast
-- radius is therefore *any* SELECT on storage.objects by `authenticated` —
-- including the existence check `upload({ upsert: true })` performs on the
-- unrelated member-intake bucket, which is how JoinDataForm.tsx uploads.
-- That's the path real members hit; the policy's own bucket was never
-- involved.
--
-- `authenticated` holds no SELECT on "User" (only Supabase's default
-- TRUNCATE/REFERENCES/TRIGGER grants), and granting it would expose every
-- row through PostgREST, since "User" has no RLS of its own. A SECURITY
-- DEFINER function reads the table with the owner's privileges instead,
-- granting the calling role nothing — same pattern as
-- member_owns_accepted_applicant_photo and handle_new_auth_user.
DROP POLICY IF EXISTS "Leaders can view applicant-intake uploads" ON storage.objects;

CREATE OR REPLACE FUNCTION public.auth_user_is_leader()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "User" WHERE id = auth.uid()::text AND role = 'leader'
  );
$$;

CREATE POLICY "Leaders can view applicant-intake uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'applicant-intake'
  AND public.auth_user_is_leader()
);
