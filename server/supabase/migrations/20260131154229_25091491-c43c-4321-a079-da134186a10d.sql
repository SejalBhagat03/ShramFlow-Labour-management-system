-- Fix RLS policies for profiles and payments tables
-- The issue is that RESTRICTIVE policies only work when combined with PERMISSIVE policies
-- We need to convert to PERMISSIVE policies for proper access control

-- First, drop existing RESTRICTIVE policies on profiles
DROP POLICY IF EXISTS "Supervisors can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create PERMISSIVE policies for profiles (authenticated users only)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Supervisors can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Drop existing RESTRICTIVE policies on payments
DROP POLICY IF EXISTS "Labour can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Supervisors can manage payments" ON public.payments;

-- Create PERMISSIVE policies for payments (authenticated users only)
CREATE POLICY "Labour can view their payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.labourers
    WHERE labourers.id = payments.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can view payments" 
ON public.payments 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND supervisor_id = auth.uid()
);

CREATE POLICY "Supervisors can insert payments" 
ON public.payments 
FOR INSERT 
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND supervisor_id = auth.uid()
);

CREATE POLICY "Supervisors can update payments" 
ON public.payments 
FOR UPDATE 
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND supervisor_id = auth.uid()
);

CREATE POLICY "Supervisors can delete payments" 
ON public.payments 
FOR DELETE 
TO authenticated
USING (
  has_role(auth.uid(), 'supervisor'::app_role) 
  AND supervisor_id = auth.uid()
);