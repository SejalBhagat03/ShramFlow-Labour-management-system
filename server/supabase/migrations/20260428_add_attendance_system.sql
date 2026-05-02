-- SHRAMFLOW: ATTENDANCE SYSTEM MIGRATION
-- Date: 2026-04-28

-- 1. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES auth.users(id),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'on_leave')),
    check_in_time TIMESTAMPTZ DEFAULT now(),
    check_out_time TIMESTAMPTZ,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(labourer_id, date) -- One entry per labourer per day
);

-- 2. Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
DROP POLICY IF EXISTS "Org members manage attendance" ON public.attendance;
CREATE POLICY "Org members manage attendance" ON public.attendance
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
    );

-- 4. Grant access to authenticated users
GRANT ALL ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
