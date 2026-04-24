-- SHRAMFLOW: INTELLIGENT ASSISTANT UPGRADE (v4)
-- Centralized migration for Command Center & Automation

-- 1. UPGRADE PROJECTS TABLE
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS site_location TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS last_entry_date DATE,
ADD COLUMN IF NOT EXISTS work_type TEXT,
ADD COLUMN IF NOT EXISTS rate_type TEXT DEFAULT 'per_meter' CHECK (rate_type IN ('per_meter', 'per_day')),
ADD COLUMN IF NOT EXISTS default_rate NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_work_target NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_work_done NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS progress_percent NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_score NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'Good';

-- 2. UPGRADE WORK ENTRIES TABLE (Add aliases/missing columns)
-- Supabase may already have some, we ensure consistency.
ALTER TABLE public.work_entries 
ADD COLUMN IF NOT EXISTS entry_date DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS work_done NUMERIC(10,2), -- Alias for 'meters' or 'units'
ADD COLUMN IF NOT EXISTS rate_applied NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS flags TEXT[]; -- For confidence/anomaly tracking

-- 3. CREATE/REFINE PAYMENTS TABLE
-- Note: We link work entries to payments for settlement tracking
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES auth.users(id), -- Usually linked to org_id in profiles
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    method TEXT DEFAULT 'cash',
    transaction_date DATE DEFAULT CURRENT_DATE,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. LINK WORK ENTRIES TO PAYMENTS
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL;

-- 5. ENABLE RLS FOR PAYMENTS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors manage payments" ON public.payments;
CREATE POLICY "Supervisors manage payments" ON public.payments
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- 6. RPC TO UPDATE PROJECT PROGRESS AUTOMATICALLY
-- This can be called from the backend after a successful work entry insert
CREATE OR REPLACE FUNCTION public.update_project_stats(_project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_done NUMERIC;
    v_target NUMERIC;
    v_progress NUMERIC;
BEGIN
    -- Calculate total work done for the project
    SELECT SUM(COALESCE(meters, work_done, 0)) INTO v_total_done
    FROM public.work_entries
    WHERE project_id = _project_id AND is_deleted = false;

    -- Get the target
    SELECT total_work_target INTO v_target
    FROM public.projects
    WHERE id = _project_id;

    -- Calculate progress percentage
    v_progress := CASE WHEN v_target > 0 THEN (v_total_done / v_target) * 100 ELSE 0 END;

    -- Update project record
    UPDATE public.projects
    SET 
        total_work_done = v_total_done,
        progress_percent = v_progress,
        last_entry_date = (SELECT MAX(date) FROM public.work_entries WHERE project_id = _project_id),
        efficiency_score = (
            SELECT CASE 
                WHEN COUNT(DISTINCT date) * COUNT(DISTINCT labourer_id) > 0 
                THEN SUM(COALESCE(meters, work_done, 0)) / (COUNT(DISTINCT date) * COUNT(DISTINCT labourer_id)) 
                ELSE 0 END
            FROM public.work_entries 
            WHERE project_id = _project_id AND is_deleted = false
        ),
        health_status = (
            SELECT 
                CASE 
                    -- CRITICAL
                    WHEN v_total_done > total_work_target AND total_work_target > 0 THEN 'Critical'
                    WHEN end_date IS NOT NULL AND end_date <= (CURRENT_DATE + 2) THEN 'Critical'
                    WHEN last_entry_date IS NOT NULL AND last_entry_date <= (CURRENT_DATE - 3) THEN 'Critical'
                    WHEN v_progress < 50 AND end_date <= (CURRENT_DATE + 3) THEN 'Critical'
                    
                    -- WARNING
                    WHEN end_date IS NOT NULL AND end_date <= (CURRENT_DATE + 7) THEN 'Warning'
                    WHEN last_entry_date IS NOT NULL AND last_entry_date <= (CURRENT_DATE - 2) THEN 'Warning'
                    -- Progress lagging check: if elapsed time % > progress %
                    WHEN start_date IS NOT NULL AND end_date IS NOT NULL AND 
                         (EXTRACT(DAY FROM (CURRENT_DATE - start_date)) / NULLIF(EXTRACT(DAY FROM (end_date - start_date)), 0) * 100) > v_progress THEN 'Warning'
                    
                    ELSE 'Good'
                END
            FROM public.projects
            WHERE id = _project_id
        )
    WHERE id = _project_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
