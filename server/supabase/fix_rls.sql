-- FIX INFINITE LOADING / RLS RECURSION
-- Run this in Supabase SQL Editor

-- 1. Allow users to read their own profile (Critical for Login)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. TEMPORARILY disable complex Supervisor checks on Profiles causing recursion
-- This allows login to proceed. We can re-enable a smarter version later.
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;

-- 3. Allow users to read their own role (Critical for Login)
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 4. TEMPORARILY disable complex Supervisor checks on Roles causing recursion
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;

-- 5. Ensure has_role is optimized and safe (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Direct lookup, no complex logic
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;
