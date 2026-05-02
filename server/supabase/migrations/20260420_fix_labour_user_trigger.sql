-- Fix handle_new_user trigger to support organization_id from user_metadata
-- This ensures labourers created by supervisors are correctly linked to the organization

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, email, full_name, first_name, last_name, phone, organization_id)
    VALUES (
        new.id, 
        new.id,
        new.email, 
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'phone',
        CASE 
            WHEN new.raw_user_meta_data->>'organization_id' IS NULL THEN NULL
            WHEN new.raw_user_meta_data->>'organization_id' IN ('null', 'undefined', '') THEN NULL
            ELSE (new.raw_user_meta_data->>'organization_id')::uuid 
        END
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        organization_id = COALESCE(EXCLUDED.organization_id, profiles.organization_id),
        user_id = EXCLUDED.id;

    -- Assign role based on metadata (defaults to 'labour')
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, (COALESCE(new.raw_user_meta_data->>'role', 'labour'))::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN new;
END;
$$;

-- Reload schema cache to apply changes
NOTIFY pgrst, 'reload config';
