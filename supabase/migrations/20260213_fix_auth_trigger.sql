-- Migration: Fix Auth Trigger and Optimize Role Checks
-- Date: 2026-02-13

-- 1. Optimize has_role function to prevent recursion and improve performance
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 2. Update handle_new_user to automatically assign a default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert Profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'phone'
  );

  -- Insert Default Role (labour) if not present
  -- Supervisors are usually created manually or via specific admin functions, 
  -- so default to 'labour' for self-signups to be safe.
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'labour')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Re-create the trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Ensure RLS on user_roles facilitates reading own role without recursion
-- (Refining the policy from 20251214 migration)
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 5. Ensure labourers table exists and has RLS (Just a safeguard check, effectively no-op if exists)
-- This is to address potential issues where initial migrations might have failed silently.
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.labour_ledger ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'labour_ledger' AND policyname = 'Supervisors can view entire ledger'
    ) THEN
        CREATE POLICY "Supervisors can view entire ledger" 
        ON public.labour_ledger FOR SELECT 
        TO authenticated 
        USING (has_role(auth.uid(), 'supervisor'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'labour_ledger' AND policyname = 'Labourers can view own ledger'
    ) THEN
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
    END IF;
END $$;
