-- =======================================================
-- ADD FOREIGN KEY CONSTRAINT FOR AUDIT LOGS -> PROFILES JOIN
-- =======================================================

-- 1. Check and drop existing constraint if it matches by some name safely
ALTER TABLE IF EXISTS public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- 2. Add full foreign key referencing public.profiles(id) 
-- instead of just auth.users
ALTER TABLE public.audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
FOREIGN KEY (user_id) 
REFERENCES public.profiles(id)
ON DELETE SET NULL;

-- 3. Verify it was added successfully by enabling queries (PostgREST reload triggers automatically)
COMMENT ON CONSTRAINT audit_logs_user_id_fkey ON public.audit_logs IS 'Enables joined selects with profiles table';
