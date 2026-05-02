-- ShramFlow: Install New Features (Projects & Deductions)

-- 1. Create Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id UUID NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: In a production environment, add RLS policies for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org projects" ON public.projects
    FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert org projects" ON public.projects
    FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()));

-- 2. Add project_id to labourers and work_entries
ALTER TABLE public.labourers ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 3. Modify payment_type check constraint (if it exists) to allow 'deduction'
-- Since Supabase table constraints vary, we'll try to just rely on the text field if no constraint exists.
-- But let's add a deduction_reason column to payments
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS deduction_reason TEXT;

-- We don't alter constraints blindly, we assume the 'payment_type' column is just a TEXT column accepting 'advance', 'settlement', 'deduction'.

NOTIFY pgrst, 'reload schema';
