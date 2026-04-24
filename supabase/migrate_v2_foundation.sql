-- ShramFlow 2.0: Phase 1 Foundation Migration (Simplified Roles)
-- IMPORTANT: Run 'ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';' FIRST!

-- 1. Create Permissions Logic
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, permission)
);

-- 2. Seed Permissions (Simplified)
-- Supervisor acts as the Organization Admin here.
INSERT INTO public.role_permissions (role, permission) VALUES
('superadmin', 'system.all'),
('supervisor', 'org.manage'),
('supervisor', 'payments.approve'),
('supervisor', 'projects.manage'),
('supervisor', 'ledger.view'),
('supervisor', 'entries.create'),
('supervisor', 'labourers.manage'),
('labour', 'portal.view')
ON CONFLICT (role, permission) DO NOTHING;

-- 3. Enhance Projects Table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS budget DECIMAL(15, 2);
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS site_location TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS end_date DATE;

-- 4. Secure Permissions with RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read permissions" ON public.role_permissions;
CREATE POLICY "Public read permissions" ON public.role_permissions FOR SELECT USING (true);

-- 5. Helper Function for Permission Check
CREATE OR REPLACE FUNCTION public.user_has_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Superadmin always has all permissions
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.role_permissions rp
    JOIN public.user_roles ur ON rp.role = ur.role
    WHERE ur.user_id = auth.uid() AND rp.permission = p_permission
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
