-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 3 MIGRATION
-- Work Entry Lifecycle

-- 1. Update status check constraint for work_entries
ALTER TABLE public.work_entries DROP CONSTRAINT IF EXISTS work_entries_status_check;
ALTER TABLE public.work_entries ADD CONSTRAINT work_entries_status_check 
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'paid'));

-- 2. Set default status to 'submitted' for new entries (unless specified)
ALTER TABLE public.work_entries ALTER COLUMN status SET DEFAULT 'submitted';

-- 3. Add rejected_reason column to work_entries
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- 4. Add approved_by and approved_at for audit
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
