-- DIAGNOSE AUTH TABLES AND PERFORMANCE
-- Run this in the Supabase SQL Editor to check the state of your auth tables.

-- 1. Check Table Sizes
SELECT 
    relname as table_name, 
    pg_size_pretty(pg_total_relation_size(relid)) as total_size,
    n_live_tup as distinct_rows
FROM pg_stat_user_tables 
WHERE relname IN ('user_roles', 'profiles', 'users');

-- 2. Check Indices
SELECT 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('user_roles', 'profiles')
ORDER BY tablename, indexname;

-- 3. Check Active RLS Policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'profiles');

-- 4. Test Query Performance (Explain Analyze)
-- Replace 'USER_ID_HERE' with the actual user ID from your logs if you want to test specifically
-- But this generic test checks for scan types.
EXPLAIN ANALYZE SELECT role FROM public.user_roles WHERE user_id = '00000000-0000-0000-0000-000000000000';

EXPLAIN ANALYZE SELECT * FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000000';
