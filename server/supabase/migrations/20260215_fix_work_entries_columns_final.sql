-- FINAL FIX for work_entries columns
-- Based on the screenshot, we have 'work_date' instead of 'date', and missing 'task_type'/'location'.

-- 1. Rename work_date to date
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'work_date') THEN
        ALTER TABLE public.work_entries RENAME COLUMN work_date TO date;
    END IF;
END $$;

-- 2. Add missing columns 'task_type' and 'location'
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Reload schema cache (Critical step included in script)
NOTIFY pgrst, 'reload config';
