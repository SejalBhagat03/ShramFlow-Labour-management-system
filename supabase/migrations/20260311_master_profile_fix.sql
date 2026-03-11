-- MASTER REPAIR: PROFILES RLS & HELPER
-- Run this to fix "policy already exists" and recursion errors once and for all.

-- 1. Create a security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. DROP ALL KNOWN PREVIOUS POLICIES (to clear conflicts)
DO $$
BEGIN
    -- Select policies
    DROP POLICY IF EXISTS "Profiles are viewable by same-org members" ON public.profiles;
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
    DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;
    
    -- Insert policies
    DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
    
    -- Update policies
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
END $$;

-- 3. CREATE FINAL OPTIMIZED POLICIES

-- SELECT: User can see themselves OR their org members
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR 
        organization_id = public.get_my_org_id()
    );

-- INSERT: User can only create their own record
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- UPDATE: User can only edit themselves
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- 4. Reload schema cache
NOTIFY pgrst, 'reload config';
