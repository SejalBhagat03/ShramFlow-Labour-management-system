-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 6 MIGRATION
-- Evidence Upload (Photo Proof)

-- 1. Add photo columns to work_entries
ALTER TABLE public.work_entries 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS before_photo_url TEXT,
ADD COLUMN IF NOT EXISTS after_photo_url TEXT;

-- 2. Create Storage Bucket (Note: Requires storage schema permissions)
-- If running in Supabase SQL Editor, this ensures the bucket exists.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-evidence', 'work-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- Allow authenticated users to upload to their organization's folder
-- (We will structure paths as: /organization_id/work_entry_id/photo.jpg)

CREATE POLICY "Allow Organization Upload" ON storage.objects 
FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'work-evidence');

CREATE POLICY "Allow Organization View" ON storage.objects 
FOR SELECT TO authenticated 
USING (bucket_id = 'work-evidence');
