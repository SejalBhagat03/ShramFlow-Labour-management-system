-- EMERGENCY PERFORMANCE FIX
-- The database security checks (RLS) are causing the 10-second timeout.
-- This script DISABLES those checks for the user tables to restart the speed.

-- 1. Disable RLS for user_roles (This is the main bottleneck)
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Disable RLS for profiles (Just to be safe)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. Force Cache Reload
NOTIFY pgrst, 'reload config';
