-- ShramFlow Stabilization: Fix Projects Multitenancy
-- This resolves the 500 error in Project Pulse and Projects pages 
-- by adding the missing organization_id column.

-- 1. Add organization_id column to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 2. Backfill with the default organization
-- This ensures existing projects are visible to the first organization.
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    -- Get the ID of the first organization found
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    -- If an organization exists, update any NULL organization_ids
    IF default_org_id IS NOT NULL THEN
        UPDATE public.projects SET organization_id = default_org_id WHERE organization_id IS NULL;
    END IF;
END $$;

-- 3. Add Index for performance
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON public.projects(organization_id);

-- 4. Reload configuration
NOTIFY pgrst, 'reload config';
