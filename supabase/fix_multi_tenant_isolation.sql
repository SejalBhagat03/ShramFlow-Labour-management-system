-- ==========================================
-- FIX: Multi-Tenant Data Isolation (Supabase)
-- ==========================================
-- Run this script in your Supabase SQL Editor to:
-- 1. Update the `handle_new_user` trigger to create a new Organization for supervisors.
-- 2. Setup/Enforce Row Level Security (RLS) for data isolation.

----------------------------------------------
-- 1. Update Auth Trigger Function
----------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
  v_role text;
  v_org_id UUID;
BEGIN
  -- Extract metadata from auth.users
  v_full_name := new.raw_user_meta_data->>'full_name';
  v_phone := new.raw_user_meta_data->>'phone';
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'supervisor');
  
  -- Fallback for name
  IF v_full_name IS NULL THEN 
    v_full_name := SPLIT_PART(new.email, '@', 1); 
  END IF;

  -- [CRITICAL FIX] Create a New Organization for Supervisors
  IF v_role = 'supervisor' THEN
      INSERT INTO public.organizations (name, owner_id)
      VALUES (v_full_name || '''s Organization', new.id)
      RETURNING id INTO v_org_id;
      
      RAISE NOTICE 'Created new organization % for supervisor %', v_org_id, new.id;
  END IF;

  -- 1. Create Profile using user_id
  -- We include organization_id to link them immediately
  BEGIN
      INSERT INTO public.profiles (user_id, email, full_name, phone, organization_id)
      VALUES (new.id, new.email, v_full_name, v_phone, v_org_id);
  EXCEPTION WHEN OTHERS THEN
      -- Fallback if schema differs (e.g., using 'id' instead of 'user_id' in profiles)
      INSERT INTO public.profiles (id, email, full_name, organization_id)
      VALUES (new.id, new.email, v_full_name, v_org_id);
  END;

  -- 2. Assign Default Role (Safe Insert)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, v_role::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN new;
END;
$$;

----------------------------------------------
-- 2. Suggestions for Row Level Security (RLS)
----------------------------------------------
-- Run the following to enable RLS and create isolation policies for all tables.
-- (Replace 'table_name' with actual tables: labourers, work_entries, payments, etc.)

/*
-- EXAMPLE TEMPLATE FOR ENABLING RLS:

ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view their own data" ON public.table_name;
CREATE POLICY "Org members view their own data" ON public.table_name 
    FOR SELECT 
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        )
    );

DROP POLICY IF EXISTS "Org supervisors manage" ON public.table_name;
CREATE POLICY "Org supervisors manage" ON public.table_name 
    FOR ALL 
    USING (
        organization_id = (
            SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
        ) 
        AND EXISTS (
            SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'supervisor'
        )
    );
*/

-- NOTE: The file `supabase/fix_saas_schema.sql` already contains an automated loop 
-- that applies these RLS policies to your critical tables!
-- If you haven't run it, make sure the automatic trigger fix above is applied first.
