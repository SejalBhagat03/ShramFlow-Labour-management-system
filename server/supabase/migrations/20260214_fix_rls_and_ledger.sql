-- Migration: Fix RLS Recursion and Ensure Ledger Exists
-- Date: 2026-02-14

-- 1. Drop existing policies on user_roles that might be recursive
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can view all roles" ON public.user_roles;

-- 2. Drop policies on profiles that might depend recursively on roles
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;

-- 3. Reinforce has_role to be SECURITY DEFINER to bypass RLS when checking roles
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

-- 4. Re-create simple, non-recursive policies for user_roles
-- Users can see their own role (Auth.uid check is cheap and safe)
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Supervisors can view all roles (Using has_role which is SECURITY DEFINER, so it won't trigger RLS on user_roles recursively)
CREATE POLICY "Supervisors can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));

-- 5. Re-create profiles policies
-- Supervisors can view all profiles
CREATE POLICY "Supervisors can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'supervisor'));

-- 6. Ensure labour_ledger exists (Idempotent check)
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Ensure RLS is enabled
ALTER TABLE public.labour_ledger ENABLE ROW LEVEL SECURITY;

-- 8. Fix labour_ledger policies
DROP POLICY IF EXISTS "Supervisors can view entire ledger" ON public.labour_ledger;
DROP POLICY IF EXISTS "Labourers can view own ledger" ON public.labour_ledger;

CREATE POLICY "Supervisors can view entire ledger" 
ON public.labour_ledger FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Labourers can view own ledger" 
ON public.labour_ledger FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.labourers 
        WHERE labourers.id = labour_ledger.labourer_id 
        AND labourers.user_id = auth.uid()
    )
);

-- 9. Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_ledger TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
