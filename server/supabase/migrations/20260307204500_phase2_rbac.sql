-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 2 MIGRATION
-- Role-Based Access Control (RBAC)

-- 1. Update user_roles check constraint
-- First, drop the old constraint if it exists. 
-- Note: In Supabase/Postgres, we might need to find the constraint name or just redefine the table if it's early stage.
-- Since the user said "Implement roles", I'll update the allowed values.

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'supervisor', 'accountant', 'labour'));

-- 2. Migrate existing 'labourer' roles to 'labour' for consistency with user request
UPDATE public.user_roles SET role = 'labour' WHERE role = 'labourer';

-- 3. Update has_role function (already exists but ensures it's current)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role::text = _role
  );
$$;

-- 4. Update the handle_new_user trigger to support 'labour' as default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    def_org_id UUID;
BEGIN
  -- 1. Get default organization (or create one)
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
    -- Ensure role is valid
    IF desired_role NOT IN ('admin', 'supervisor', 'accountant', 'labour') THEN
        desired_role := 'labour';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, desired_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END;

  RETURN new;
END;
$$;
