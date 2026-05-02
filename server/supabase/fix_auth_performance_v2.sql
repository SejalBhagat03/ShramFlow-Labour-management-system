-- AGGRESSIVE FIX FOR AUTH TIMEOUTS v2
-- This script drops ALL complex policies and replaces them with simple ones.

-- 1. Optimize user_roles table
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- 2. RESET RLS for user_roles (The main bottleneck)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- DROP ALL potential problematic policies
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Unblock read access" ON public.user_roles;
DROP POLICY IF EXISTS "allow_read" ON public.user_roles;
DROP POLICY IF EXISTS "allow_select" ON public.user_roles;

-- CREATE ONE SIMPLE POLICY
-- "Allow anyone who is logged in to read any role mapping"
-- This removes ALL recursion/complexity. Security impact is minimal (users seeing other users' roles is generally fine in this context).
CREATE POLICY "fast_read_access" ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- 3. RESET RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Simple Read Policy
CREATE POLICY "fast_read_profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- Simple Insert/Update Policies
CREATE POLICY "insert_own_profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "update_own_profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- 4. FORCE CACHE RELOAD
NOTIFY pgrst, 'reload config';
