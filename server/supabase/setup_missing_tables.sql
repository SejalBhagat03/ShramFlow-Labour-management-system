-- ADD MISSING TABLES & COLUMNS
-- Run this in Supabase SQL Editor to fix 404/400 errors

-- 1. Create Activities Table (for logs/history)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own activities" ON public.activities;
CREATE POLICY "Users view own activities" ON public.activities
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Supervisors view all activities" ON public.activities;
CREATE POLICY "Supervisors view all activities" ON public.activities
    FOR SELECT USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- 2. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Supervisors manage payments" ON public.payments;
CREATE POLICY "Supervisors manage payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- 3. Fix Work Entries (Missing columns causing 400 error)
ALTER TABLE public.work_entries 
ADD COLUMN IF NOT EXISTS meters NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS hours NUMERIC(10,2);

-- 4. Grant Permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
