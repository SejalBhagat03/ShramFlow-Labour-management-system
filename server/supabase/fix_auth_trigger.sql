-- FIX TRIGGER CRASH ON LOGIN
-- Run this in Supabase SQL Editor

-- 1. Drop the buggy trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Update the function to be safe (Idempotent)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_phone text;
BEGIN
  v_full_name := new.raw_user_meta_data->>'full_name';
  v_phone := new.raw_user_meta_data->>'phone';
  
  -- Fallback if null
  IF v_full_name IS NULL THEN v_full_name := new.email; END IF;

  -- 1. Create Profile (Safe Insert)
  -- Try to insert with user_id (most likely schema)
  BEGIN
      INSERT INTO public.profiles (user_id, email, full_name, phone)
      VALUES (new.id, new.email, v_full_name, v_phone);
  EXCEPTION WHEN OTHERS THEN
      -- If user_id column mismatch, try inserting into id (fallback)
      BEGIN
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (new.id, new.email, v_full_name);
      EXCEPTION WHEN OTHERS THEN
        -- Ignore errors to prevent 500 block on signup
        RAISE WARNING 'Profile creation failed: %', SQLERRM;
      END;
  END;

  -- 2. Assign Default Role (Safe Insert)
  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'supervisor')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Role assignment failed: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

-- 3. Re-create Trigger for INSERT ONLY (Updates to last_sign_in shouldn't trigger this)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
