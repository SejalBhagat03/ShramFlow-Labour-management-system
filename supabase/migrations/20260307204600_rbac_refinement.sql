-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 2 REFINEMENT
-- Role Consolidation (Supervisor + Labour only)

-- 1. Migrate any existing 'admin' or 'accountant' roles to 'supervisor'
UPDATE public.user_roles 
SET role = 'supervisor' 
WHERE role IN ('admin', 'accountant');

-- 2. Update the check constraint to only allow 'supervisor' and 'labour'
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('supervisor', 'labour'));

-- 3. Update the handle_new_user() trigger to reflect new allowed roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    def_org_id UUID;
BEGIN
  -- 1. Get default organization (ensures multi-tenancy)
  SELECT id INTO def_org_id FROM public.organizations ORDER BY created_at LIMIT 1;
  
  -- 2. Create Profile
  INSERT INTO public.profiles (id, email, full_name, organization_id)
  VALUES (
      new.id, 
      new.email, 
      COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
      COALESCE((new.raw_user_meta_data->>'organization_id')::UUID, def_org_id)
  );

  -- 3. Assign role based on metadata (defaults to 'labour')
  DECLARE
    desired_role text := COALESCE(new.raw_user_meta_data->>'role', 'labour');
  BEGIN
    -- Only allow valid roles: supervisor or labour
    IF desired_role NOT IN ('supervisor', 'labour') THEN
        desired_role := 'labour';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, desired_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END;

  RETURN new;
END;
$$;
