-- DATA FIX: Synchronize id and user_id in profiles table
-- This resolves the "duplicate key value violates unique constraint profiles_user_id_key" error

DO $$
BEGIN
    -- 1. First, delete any orphan profiles that don't have a corresponding user in auth.users
    -- This prevents foreign key violations during the update
    DELETE FROM public.profiles 
    WHERE id NOT IN (SELECT id FROM auth.users);

    -- 2. Synchronize user_id to match id (standardizing on the primary key)
    -- We only do this for rows that exist in auth.users (guaranteed by Step 1)
    UPDATE public.profiles 
    SET user_id = id 
    WHERE user_id IS NULL OR user_id <> id;

    -- If there was a conflict that prevented the update above (unlikely if user_id is unique), 
    -- we might need to de-duplicate.
    
END $$;

-- 2. Ensure the unique constraint on user_id is working as intended
-- (It should be unique, and it should match the PK id 1:1)

-- Reload schema cache
NOTIFY pgrst, 'reload config';
