-- SHRAMFLOW SAAS ARCHITECTURE: PHASE 7 MIGRATION
-- Activity Audit Logs

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'APPROVE'
    entity_type TEXT NOT NULL, -- e.g., 'WorkEntry', 'Labourer', 'Payment'
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- 3. RLS Policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view organization logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
        AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'supervisor'
    );

-- 4. Helper function to log audit
CREATE OR REPLACE FUNCTION public.log_audit(
    _org_id UUID,
    _user_id UUID,
    _action TEXT,
    _entity_type TEXT,
    _entity_id UUID,
    _old JSONB DEFAULT NULL,
    _new JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (organization_id, user_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (_org_id, _user_id, _action, _entity_type, _entity_id, _old, _new);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
