-- ShramFlow SaaS Recovery: Fix Missing Relationships
-- 1. Add project_id to work_entries
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- 2. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_work_entries_project_id ON public.work_entries(project_id);

-- 3. Update RLS (if needed, but existing supervisor policy should cover it)
NOTIFY pgrst, 'reload schema';
