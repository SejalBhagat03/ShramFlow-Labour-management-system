-- Migration to align work_entries table with Frontend Code expectation
-- This fixes the 400 Bad Request error when saving work entries

-- 1. Rename columns if they exist (safe renames)
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'site_location') THEN
        ALTER TABLE public.work_entries RENAME COLUMN site_location TO location;
    END IF;
    
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'work_type') THEN
        ALTER TABLE public.work_entries RENAME COLUMN work_type TO task_type;
    END IF;
END $$;

-- 2. Drop columns that are replaced or incompatible (like the generated total_amount)
ALTER TABLE public.work_entries DROP COLUMN IF EXISTS total_amount;
ALTER TABLE public.work_entries DROP COLUMN IF EXISTS quantity;

-- 3. Add new columns expected by Frontend
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS meters NUMERIC(10,2);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS hours NUMERIC(10,2);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2); -- Replaces total_amount
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- 4. Ensure RLS policies cover the new columns (usually they do automatically for ALL)
-- Verify we have a policy for insertion
DROP POLICY IF EXISTS "Supervisors manage work" ON public.work_entries;
CREATE POLICY "Supervisors manage work" ON public.work_entries
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));
