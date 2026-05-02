-- FIX PROJECTS TABLE: Add organization_id and link to default org
-- This resolves the 500 Internal Server Error when querying projects

DO $$
BEGIN
    -- 1. Ensure organization_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'organization_id') THEN
        ALTER TABLE public.projects ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
        RAISE NOTICE 'Added organization_id to projects';
    END IF;

    -- 2. Link existing projects to the first available organization if they have none
    DECLARE
        def_org_id UUID;
    BEGIN
        SELECT id INTO def_org_id FROM public.organizations ORDER BY created_at LIMIT 1;
        
        IF def_org_id IS NOT NULL THEN
            UPDATE public.projects SET organization_id = def_org_id WHERE organization_id IS NULL;
            RAISE NOTICE 'Linked projects to default organization %', def_org_id;
        ELSE
            RAISE NOTICE 'No organizations found to link projects to.';
        END IF;
    END;

    -- 3. Enable RLS and add policies
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Org members view projects" ON public.projects;
    CREATE POLICY "Org members view projects" ON public.projects 
        FOR SELECT USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

    DROP POLICY IF EXISTS "Supervisors manage projects" ON public.projects;
    CREATE POLICY "Supervisors manage projects" ON public.projects 
        FOR ALL USING (
            organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()) 
            AND (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'))
        );

END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
