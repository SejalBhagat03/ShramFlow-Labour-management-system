-- REAL-TIME NOTIFICATIONS SYSTEM
-- Run this in Supabase SQL Editor

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- The recipient
    type TEXT NOT NULL, -- 'payment_request', 'payment_approved', 'work_approved', 'info'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_url TEXT -- Optional link to click
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can read their own notifications
CREATE POLICY "Users can read own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Anyone (supervisors/labourers) can insert notifications for others (if they have permission)
-- For simplicity, let authenticated users insert notifications
CREATE POLICY "Users can insert notifications" ON public.notifications
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 2. Create Advance Requests Table (if not exists)
CREATE TABLE IF NOT EXISTS public.advance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    request_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

-- Policies for Advance Requests
CREATE POLICY "Labourers can view own requests" ON public.advance_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.labourers WHERE id = advance_requests.labourer_id AND user_id = auth.uid())
    );

CREATE POLICY "Labourers can insert own requests" ON public.advance_requests
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.labourers WHERE id = advance_requests.labourer_id AND user_id = auth.uid())
    );

CREATE POLICY "Supervisors can view all requests" ON public.advance_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('supervisor', 'admin'))
    );

CREATE POLICY "Supervisors can update requests" ON public.advance_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('supervisor', 'admin'))
    );

-- 3. Enable Realtime
-- You must manually enable Realtime for 'notifications' table in Supabase Dashboard -> Database -> Replication
-- Or via SQL if on self-hosted/local:
alter publication supabase_realtime add table public.notifications;
