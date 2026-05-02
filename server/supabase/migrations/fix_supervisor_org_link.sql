-- ShramFlow Stabilization: Link Supervisor to Organization
-- This fixes the "Invisible Labourers" and "CORS/Auth Error" by 
-- ensuring the supervisor is linked to the Default Organization.

DO $$
DECLARE
    default_org_id UUID;
    v_supervisor_id UUID := 'a5ae825d-406f-48b1-a8c5-3ba46c826235'; -- The ID from your logs
BEGIN
    -- 1. Ensure a Default Organization exists
    SELECT id INTO default_org_id FROM public.organizations LIMIT 1;
    
    IF default_org_id IS NULL THEN
        INSERT INTO public.organizations (name) VALUES ('Main Organization') RETURNING id INTO default_org_id;
    END IF;

    -- 2. Link the Supervisor to this organization
    UPDATE public.profiles 
    SET organization_id = default_org_id 
    WHERE id = v_supervisor_id;

    -- 3. If the profile doesn't exist yet (unlikely), create it
    INSERT INTO public.profiles (id, user_id, full_name, organization_id)
    VALUES (v_supervisor_id, v_supervisor_id, 'Supervisor', default_org_id)
    ON CONFLICT (id) DO UPDATE SET organization_id = default_org_id;

    -- 4. Assign supervisor role if missing
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_supervisor_id, 'supervisor')
    ON CONFLICT (user_id, role) DO NOTHING;

END $$;

-- 5. Reload configuration
NOTIFY pgrst, 'reload config';
