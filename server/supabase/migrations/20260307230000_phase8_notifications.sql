-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 8 MIGRATION
-- Notifications System (Corrected for Compatibility)

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'payment_request'
    read BOOLEAN DEFAULT FALSE, -- Matches frontend service
    action_url TEXT, -- Matches frontend service
    metadata JSONB, -- For payment_request data
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexing
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_org ON public.notifications(organization_id);

-- 3. RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 4. Helper function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    _org_id UUID,
    _user_id UUID,
    _title TEXT,
    _message TEXT,
    _type TEXT DEFAULT 'info',
    _action_url TEXT DEFAULT NULL,
    _metadata JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.notifications (organization_id, user_id, title, message, type, action_url, metadata)
    VALUES (_org_id, _user_id, _title, _message, _type, _action_url, _metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Automated Trigger for Disputes
CREATE OR REPLACE FUNCTION public.notify_on_dispute()
RETURNS TRIGGER AS $$
DECLARE
    entry_org_id UUID;
    entry_supervisor_id UUID;
    labourer_name TEXT;
BEGIN
    IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
        -- Get context from daily_work_register (assuming it has the supervisor info)
        -- Since we consolidated roles, any supervisor in the org should probably see it
        -- But for now, let's notify the primary supervisor if we can find one.
        
        SELECT organization_id INTO entry_org_id FROM public.profiles WHERE id = NEW.labourer_id;
        SELECT full_name INTO labourer_name FROM public.profiles WHERE id = NEW.labourer_id;

        -- Find all supervisors in the organization to notify
        INSERT INTO public.notifications (organization_id, user_id, title, message, type, action_url)
        SELECT 
            entry_org_id, 
            ur.user_id, 
            'Dispute Raised', 
            labourer_name || ' has disputed a work entry.', 
            'warning',
            '/work-disputes'
        FROM public.user_roles ur
        WHERE ur.role = 'supervisor' 
        AND ur.user_id IN (SELECT id FROM public.profiles WHERE organization_id = entry_org_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_on_dispute
AFTER UPDATE ON public.work_acknowledgments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_dispute();
