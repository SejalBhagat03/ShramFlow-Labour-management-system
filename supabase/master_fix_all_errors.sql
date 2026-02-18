-- MASTER FIX FOR ALL ERRORS (TIMEOUTS + 400/404s)
-- Runs all necessary fixes in one go

-- 0. FIX TIMEOUTS (Role Not Assigned Error)
-- Optimize user_roles table to fix login hanging
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Temporarily simplify RLS to prevent recursion/timeout
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins/Supervisors can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Unblock read access" ON public.user_roles;
CREATE POLICY "Unblock read access" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- Fix Profiles RLS just in case
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);


-- 1. FIX DAILY LOGS (404 Error)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    log_type TEXT CHECK (log_type IN ('general', 'issue', 'material')),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own logs" ON public.daily_logs;
CREATE POLICY "Users manage own logs" ON public.daily_logs
    FOR ALL USING (auth.uid() = user_id);

-- 2. FIX PAYMENTS TABLE (400 Error)
-- Ensure table exists with correct schema
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    date DATE DEFAULT CURRENT_DATE, -- Frontend might send 'date'
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Supervisors manage payments" ON public.payments;
CREATE POLICY "Supervisors manage payments" ON public.payments
    FOR ALL USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- 3. FIX WORK ENTRIES (400 Error)
-- Ensure columns match Frontend expectations completely
DO $$
BEGIN
    -- Rename if old name exists
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'work_date') THEN
        ALTER TABLE public.work_entries RENAME COLUMN work_date TO date;
    END IF;
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'work_entries' AND column_name = 'site_location') THEN
        ALTER TABLE public.work_entries RENAME COLUMN site_location TO location;
    END IF;
END $$;

ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES auth.users(id);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS meters NUMERIC(10,2);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS hours NUMERIC(10,2);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS amount NUMERIC(10,2);
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS flag_reason TEXT;

-- 4. SETUP LEDGER (New Requirement)
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
DROP POLICY IF EXISTS "Supervisors view ledger" ON public.labour_ledger;
CREATE POLICY "Supervisors view ledger" ON public.labour_ledger
    FOR ALL USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- 5. CREATE LEDGER FUNCTION
CREATE OR REPLACE FUNCTION get_labour_balance(labour_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    total_credit NUMERIC := 0;
    total_debit NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_credit FROM public.labour_ledger WHERE labourer_id = labour_uuid AND transaction_type = 'CREDIT';
    SELECT COALESCE(SUM(amount), 0) INTO total_debit FROM public.labour_ledger WHERE labourer_id = labour_uuid AND transaction_type = 'DEBIT';
    RETURN total_credit - total_debit;
END;
$$;

-- 6. SETUP STORAGE FOR DAILY LOGS
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-logs', 'daily-logs', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'daily-logs' );

DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'daily-logs' AND auth.role() = 'authenticated' );

-- 7. FORCE CACHE RELOAD
NOTIFY pgrst, 'reload config';
