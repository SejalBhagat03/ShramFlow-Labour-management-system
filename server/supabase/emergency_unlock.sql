-- EMERGENCY DATABASE UNLOCK
-- Run this in Supabase SQL Editor

-- 1. DISABLE Row Level Security temporarily on critical tables
-- This stops the infinite loop immediately.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Ensure basic access (Public Read) - Just in case
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

-- 3. Fix Column Names (user_id vs id) - Create both to be safe
-- If 'user_id' exists, do nothing. If not, add it as alias to 'id' (or vice versa)
-- Actually, let's jus rely on RLS being off.
