-- FINAL AUTH REPAIR: FIXES RECURSION AND REGRESSION
-- Ensures users can always see their own records.

-- 1. Redefine get_my_org_id to be robust and non-recursive
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Query with SECURITY DEFINER bypasses RLS on the table it queries
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. Redefine has_role to be robust
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- 3. Fix Profiles RLS (Restore the self-view override)
DROP POLICY IF EXISTS "Profiles are viewable by same-org members" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id -- SELF VIEW (This was the missing piece!)
        OR 
        organization_id = public.get_my_org_id() -- ORG VIEW
    );

-- 4. Fix User Roles RLS (Use the security definer function)
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;

CREATE POLICY "user_roles_select_policy" ON public.user_roles
    FOR SELECT USING (
        auth.uid() = user_id -- SELF VIEW
        OR 
        public.get_my_org_id() IS NOT NULL -- Allow if user belongs to an org
    );

-- Reload schema cache
NOTIFY pgrst, 'reload config';
