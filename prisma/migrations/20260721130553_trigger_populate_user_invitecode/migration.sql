-- Fix: handle_new_auth_user() omitted User."inviteCode", which is NOT NULL
-- with no database-level default (the schema's @default(cuid()) is generated
-- by Prisma in application code, not by Postgres). The original trigger's
-- INSERT therefore threw a not-null violation on every invited user's first
-- Google sign-in — surfacing to Supabase Auth as "Database error saving new
-- user". Uninvited sign-ins never hit it because the trigger no-ops when no
-- PendingInvite matches.
--
-- Populate inviteCode in-SQL with gen_random_uuid() (Postgres core, available
-- on Supabase). The trigger is the sole creator of User rows (Plan 15b dropped
-- the applicant->user path), so a UUID token here is the authoritative value;
-- format isn't semantically constrained.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite public."PendingInvite";
BEGIN
  SELECT * INTO invite FROM public."PendingInvite" WHERE email = NEW.email;

  IF FOUND THEN
    INSERT INTO public."User" (id, email, name, role, "inviteCode", "recruiterId")
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      invite.role,
      gen_random_uuid()::text,
      invite."recruiterId"
    );

    DELETE FROM public."PendingInvite" WHERE id = invite.id;
  END IF;

  RETURN NEW;
END;
$$;
