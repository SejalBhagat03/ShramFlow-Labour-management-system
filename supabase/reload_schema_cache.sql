-- Force Reload of Supabase PostgREST Schema Cache
-- Run this if you see errors like "Could not find column ... in schema cache"

NOTIFY pgrst, 'reload config';

-- Verify the columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_entries';
