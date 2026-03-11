-- FINAL SCHEMA STANDARDIZATION FOR PROFILES
-- Ensures compatibility with both 'id' and 'user_id' naming conventions

DO $$
BEGIN
    -- 1. Ensure user_id exists and is NOT NULL if it was meant to be the identifier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    -- 2. Backfill user_id from id (or vice versa)
    UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
    UPDATE public.profiles SET id = user_id WHERE id IS NULL;

    -- 3. Make user_id NOT NULL if it isn't already
    ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

END $$;

-- 4. Update the trigger to populate BOTH id and user_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, full_name, first_name, last_name, phone)
    VALUES (
        new.id, 
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
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        user_id = EXCLUDED.id; -- Sync just in case

    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'role', 'labour'))
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$;

-- 5. Update RLS policies to handle both columns safely
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR auth.uid() = user_id OR organization_id = get_my_org_id()
    );

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (
        auth.uid() = id OR auth.uid() = user_id
    );

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id OR auth.uid() = user_id
    );

-- Reload schema cache
NOTIFY pgrst, 'reload config';
