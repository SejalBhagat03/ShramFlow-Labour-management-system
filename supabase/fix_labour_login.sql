-- FIX LABOUR LOGIN RLS
-- Run this in Supabase SQL Editor

-- 1. Allow labourers to read their own record (Critical for Login)
DROP POLICY IF EXISTS "Labourers can view their own record" ON public.labourers;
CREATE POLICY "Labourers can view their own record" ON public.labourers
  FOR SELECT USING (auth.uid() = user_id);

-- 2. TEMPORARILY disable complex/recursive policies on labourers if any
DROP POLICY IF EXISTS "Supervisors can view all labourers" ON public.labourers;
DROP POLICY IF EXISTS "Admins can view all labourers" ON public.labourers;

-- 3. Ensure they can read their own profile (re-apply just in case)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
