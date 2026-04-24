-- ShramFlow Hotfix: Final Auth Trigger Repair (v3)
-- 1. SCHEMA REPAIR: Add missing 'email' column to profiles
-- 2. TRIGGER REPAIR: Reconcile handle_new_user with current schema

-- PHASE 1: Add missing columns if they don't exist
DO $$
BEGIN
    -- Ensure 'email' column exists (Critical for the trigger)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;

    -- Ensure 'organization_id' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
        ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;

    -- Ensure 'user_id' exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- PHASE 2: Drop existing trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- PHASE 3: Refine the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    sanitized_org_id UUID;
    meta_org_id TEXT;
BEGIN
    -- Extract orgId from metadata
    meta_org_id := new.raw_user_meta_data->>'organization_id';
    
    -- Robust UUID sanitization
    IF meta_org_id IS NULL OR meta_org_id IN ('null', 'undefined', '') THEN
        sanitized_org_id := NULL;
    ELSE
        BEGIN
            sanitized_org_id := meta_org_id::UUID;
        EXCEPTION WHEN others THEN
            sanitized_org_id := NULL;
        END;
    END IF;

    -- Insert into public.profiles
    -- We populate BOTH id and user_id to satisfy all potential schema versions
    INSERT INTO public.profiles (
        id, 
        user_id, 
        email, 
        full_name, 
        first_name, 
        last_name, 
        phone, 
        organization_id
    )
    VALUES (
        new.id, 
        new.id,
        new.email, 
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'phone',
        sanitized_org_id
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        organization_id = COALESCE(EXCLUDED.organization_id, public.profiles.organization_id),
        user_id = EXCLUDED.id;

    -- PHASE 4: Assign Initial Role (Defaults to 'labour')
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        new.id, 
        (COALESCE(new.raw_user_meta_data->>'role', 'labour'))::public.app_role
    )
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$;

-- PHASE 5: Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PHASE 6: Reload configuration
NOTIFY pgrst, 'reload config';
