-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 1 MIGRATION
-- Multi-Tenant System and Data Isolation

-- 1. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Add organization_id to Existing Tables
-- PROFILES: Each user profile must belong to an organization
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- LABOURERS: Each labourer record belongs to an organization
ALTER TABLE public.labourers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- WORK ENTRIES: Each work entry belongs to an organization
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- LABOUR LEDGER / PAYMENTS: Each record belongs to an organization
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- 3. Enhance RLS for Organizational Isolation
-- Note: We assume that users can only see data within their own organization.

-- Enable RLS on Organizations (Admins only for now)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own organization" ON public.organizations;
CREATE POLICY "Users can view their own organization" ON public.organizations
    FOR SELECT USING (
        id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        OR owner_id = auth.uid()
    );

-- Update PROFILES RLS
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by same-org members" ON public.profiles
    FOR SELECT USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    );

-- Update LABOURERS RLS
DROP POLICY IF EXISTS "Supervisors manage labourers" ON public.labourers;
CREATE POLICY "Org members manage labourers" ON public.labourers
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'accountant'))
    );

-- Update WORK ENTRIES RLS
DROP POLICY IF EXISTS "Supervisors manage work" ON public.work_entries;
CREATE POLICY "Org members manage work" ON public.work_entries
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'accountant'))
    );

-- Update LEDGER RLS
DROP POLICY IF EXISTS "Supervisors manage ledger" ON public.labour_ledger;
CREATE POLICY "Org members manage ledger" ON public.labour_ledger
    FOR ALL USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'accountant'))
    );

-- 4. Create Default Organization for Migration (if needed)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE name = 'Default Organization') THEN
        INSERT INTO public.organizations (name) VALUES ('Default Organization');
    END IF;
END $$;

-- 5. Backfill existing data with the first organization (for backward compatibility)
DO $$
DECLARE
    default_org_id UUID;
BEGIN
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    UPDATE public.profiles SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.labourers SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.work_entries SET organization_id = default_org_id WHERE organization_id IS NULL;
    UPDATE public.labour_ledger SET organization_id = default_org_id WHERE organization_id IS NULL;
END $$;
