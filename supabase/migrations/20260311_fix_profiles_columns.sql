-- Migration to add first_name, last_name, and phone to profiles
-- This aligns the database schema with the new frontend requirements

DO $$
BEGIN
    -- 1. Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.profiles ADD COLUMN phone TEXT;
    END IF;

    -- 2. Backfill first_name and last_name from full_name if empty
    UPDATE public.profiles 
    SET 
        first_name = split_part(full_name, ' ', 1),
        last_name = CASE 
            WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1)
            ELSE ''
        END
    WHERE (first_name IS NULL OR first_name = '') AND full_name IS NOT NULL;

END $$;

-- 3. Update handle_new_user function to populate new columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, first_name, last_name, phone)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone);

    -- Assign role based on metadata (defaults to 'labour')
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'role', 'labour'))
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
