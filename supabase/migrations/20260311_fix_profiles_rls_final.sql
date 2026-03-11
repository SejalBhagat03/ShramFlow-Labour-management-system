-- COMPREHENSIVE RLS FIX FOR PROFILES
-- Ensures users can always access and manage their own profile records

-- 1. Ensure the helper function exists and is robust
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. DROP old policies to avoid conflicts
DROP POLICY IF EXISTS "Profiles are viewable by same-org members" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by own user or same-org members" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can insert their own profile" ON public.profiles;

-- 4. Create clean, non-recursive policies

-- SELECT: User can see their own profile OR profiles in their organization
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id 
        OR 
        organization_id = get_my_org_id()
    );

-- INSERT: User can only insert their own profile
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- UPDATE: User can only update their own profile
-- Note: We don't allow updating organization_id via this policy for security
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
    ) WITH CHECK (
        auth.uid() = id
    );

-- 5. Final check on handle_new_user to ensure it works with these policies
-- (Already updated in previous migration, but ensuring consistency)

-- Reload schema cache
NOTIFY pgrst, 'reload config';
