-- FIX FOR INFINITE RECURSION IN PROFILES POLICY
-- The error occurs because the policy for 'profiles' references 'profiles' in a subquery

-- 1. Create a security definer function to get organization_id without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Update PROFILES RLS policy to use the function
DROP POLICY IF EXISTS "Profiles are viewable by same-org members" ON public.profiles;
CREATE POLICY "Profiles are viewable by same-org members" ON public.profiles
    FOR SELECT USING (
        organization_id = get_my_org_id()
    );

-- 3. Update UPDATE policy just to be safe (though it was likely fine)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- 4. Also fix user_roles if it has similar recursion issues
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
CREATE POLICY "Admins/Supervisors can view all roles" ON public.user_roles
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor')
    );

-- Reload schema cache
NOTIFY pgrst, 'reload config';
