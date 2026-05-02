-- 1. Add Smart Analytics columns to Labourers
ALTER TABLE public.labourers 
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 70,
ADD COLUMN IF NOT EXISTS trust_badge TEXT DEFAULT 'normal';

-- 2. Create Daily Logs table (Automated Admin Diary)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT NOT NULL,
    description TEXT,
    log_type TEXT CHECK (log_type IN ('proof', 'diary', 'summary')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Create Activities table (Global notifications feed)
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supervisor_id UUID REFERENCES auth.users(id) NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    message_hindi TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Daily Logs
DROP POLICY IF EXISTS "Supervisors can manage logs" ON public.daily_logs;
CREATE POLICY "Supervisors can manage logs" ON public.daily_logs
    FOR ALL USING (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));

-- 6. Policies for Activities
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;
CREATE POLICY "Users can view activities" ON public.activities
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Supervisors can create activities" ON public.activities;
CREATE POLICY "Supervisors can create activities" ON public.activities
    FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'supervisor') OR has_role(auth.uid(), 'admin'));
