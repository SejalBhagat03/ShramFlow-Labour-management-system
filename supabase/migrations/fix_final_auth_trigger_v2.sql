-- ShramFlow Hotfix: Final Auth Trigger Repair
-- This fixes the "Database error creating new user" by reconciling 
-- the handle_new_user trigger with the current profiles table schema.

-- 1. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Refine the handle_new_user function
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
    -- We populate both id and user_id to ensure compatibility with all legacy migrations
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

    -- 3. Assign Initial Role (Defaults to 'labour')
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
        new.id, 
        (COALESCE(new.raw_user_meta_data->>'role', 'labour'))::public.app_role
    )
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$;

-- 4. Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Reload configuration
NOTIFY pgrst, 'reload config';
