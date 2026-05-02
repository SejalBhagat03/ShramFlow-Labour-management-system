-- 1. Create role enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('supervisor', 'labour');
    END IF;
END $$;

-- 2. Create Organizations Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Create missing tables for Audit and Notifications (Phase 7 & 8)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create role helper functions (ensure they exist for RLS)
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_organization(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id AND role = p_role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = p_user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_organization(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1
$$;

-- 2. Add organization_id to all relevant tables
DO $$
DECLARE
    table_name_text TEXT;
    target_tables TEXT[] := ARRAY['profiles', 'labourers', 'work_entries', 'payments', 'labour_ledger', 'activities', 'daily_logs', 'notifications', 'audit_logs'];
BEGIN
    FOREACH table_name_text IN ARRAY target_tables
    LOOP
        -- Check if table exists before trying to alter
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name_text) THEN
            -- Check if column exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = table_name_text AND column_name = 'organization_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN organization_id UUID REFERENCES public.organizations(id)', table_name_text);
                RAISE NOTICE 'Added organization_id to %', table_name_text;
            END IF;
        END IF;
    END LOOP;

    -- PHASE 6: Add Evidence columns to work_entries if missing
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'work_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'image_urls') THEN
            ALTER TABLE public.work_entries ADD COLUMN image_urls TEXT[];
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'location') THEN
            ALTER TABLE public.work_entries ADD COLUMN location JSONB;
        END IF;
    END IF;
END $$;

-- 3. Ensure moving 'user_id' check for profiles (if needed)
-- Some controllers might depend on profiles.user_id vs profiles.id
-- Already handled in earlier server fix, but good to keep in mind.

-- 4. Ensure a default organization exists
INSERT INTO public.organizations (name)
SELECT 'Default Organization'
WHERE NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1)
RETURNING id;

-- 5. Link existing data to the default organization
DO $$
DECLARE
    def_org_id UUID;
    table_name_text TEXT;
    target_tables TEXT[] := ARRAY['profiles', 'labourers', 'work_entries', 'payments', 'labour_ledger', 'activities', 'daily_logs', 'notifications', 'audit_logs'];
BEGIN
    SELECT id INTO def_org_id FROM public.organizations LIMIT 1;
    
    FOREACH table_name_text IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name_text) THEN
            EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', table_name_text, def_org_id);
        END IF;
    END LOOP;
END $$;

-- 6. Setup RLS for Organization-Level Isolation (Standard Pattern)
DO $$
DECLARE
    table_name_text TEXT;
    target_tables TEXT[] := ARRAY['profiles', 'labourers', 'work_entries', 'payments', 'labour_ledger', 'activities', 'daily_logs', 'notifications', 'audit_logs'];
BEGIN
    FOREACH table_name_text IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = table_name_text) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name_text);
            EXECUTE format('DROP POLICY IF EXISTS "Org members view their own data" ON public.%I', table_name_text);
            -- Note: We use a SECURITY DEFINER function to avoid RLS recursion on the profiles table
            EXECUTE format('CREATE POLICY "Org members view their own data" ON public.%I FOR SELECT USING (organization_id = public.get_user_organization(auth.uid()))', table_name_text);
            
            -- Supervisors can do all actions within their org
            EXECUTE format('DROP POLICY IF EXISTS "Org supervisors manage" ON public.%I', table_name_text);
            EXECUTE format('CREATE POLICY "Org supervisors manage" ON public.%I FOR ALL USING (organization_id = public.get_user_organization(auth.uid()) AND public.get_user_role(auth.uid()) = ''supervisor'')', table_name_text);
        END IF;
    END LOOP;
END $$;

-- 7. Fix handle_new_user trigger to correctly link new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    def_org_id UUID;
BEGIN
  -- Get the first organization for auto-joining
  SELECT id INTO def_org_id FROM public.organizations ORDER BY created_at LIMIT 1;
  
  -- Create Profile using user_id correctly
  INSERT INTO public.profiles (user_id, full_name, organization_id)
  VALUES (
      new.id, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
      COALESCE((new.raw_user_meta_data->>'organization_id')::UUID, def_org_id)
  );

  -- Assign default role 'supervisor' for first users or 'labour' for workers
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'role', 'supervisor')::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

-- 8. Final Cache Refresh
NOTIFY pgrst, 'reload config';
