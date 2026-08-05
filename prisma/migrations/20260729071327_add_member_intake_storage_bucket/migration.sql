-- Storage bucket for the "Isi Data" intake form's photo uploads (KTP,
-- selfie, kartu keluarga, buku tabungan, KTP pasangan). Private bucket —
-- objects are only reachable via a signed URL generated server-side for the
-- uploading member, not a public URL. Path convention is
-- "<userId>/<field>.<ext>" (one current file per member per field,
-- overwritten on re-upload), which is what the RLS policy below scopes on.
-- Mirrors the "test-results" bucket from Plan 17
-- (20260727044848_add_mbti_self_motivation_lead_sources).
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-intake', 'member-intake', false)
ON CONFLICT (id) DO NOTHING;

-- Lets a signed-in member manage (upload/overwrite/read) only objects under
-- their own "<userId>/..." folder — enforced via auth.uid(), since this
-- bucket is written to directly from the browser (Supabase client), not
-- through a Next.js server action.
CREATE POLICY "Members manage own member-intake uploads"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'member-intake' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'member-intake' AND (storage.foldername(name))[1] = auth.uid()::text);
