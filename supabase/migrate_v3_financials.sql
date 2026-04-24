-- ShramFlow 2.0: Phase 3 Financial Transparency & Fraud Detection
-- 1. Bulk Settlement RPC
-- This function atomizes the payment creation and work entry status update.

CREATE OR REPLACE FUNCTION public.bulk_settle_work_entries(
    _labour_id UUID, 
    _org_id UUID, 
    _supervisor_id UUID, 
    _method TEXT, 
    _amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _payment_id UUID;
BEGIN
    -- Only proceed if amount > 0
    IF _amount <= 0 THEN
        RAISE EXCEPTION 'Settlement amount must be greater than zero';
    END IF;

    -- 1. Create the payment record
    INSERT INTO public.payments (
        organization_id, 
        labourer_id, 
        supervisor_id, 
        amount, 
        method, 
        status, 
        transaction_date, 
        payment_verified_at
    )
    VALUES (
        _org_id, 
        _labour_id, 
        _supervisor_id, 
        _amount, 
        _method, 
        'paid', 
        CURRENT_DATE, 
        NOW()
    )
    RETURNING id INTO _payment_id;

    -- 2. Mark work entries as paid
    -- Using the exact same filters to ensure consistency
    UPDATE public.work_entries
    SET status = 'paid'
    WHERE labourer_id = _labour_id 
      AND organization_id = _org_id 
      AND status = 'approved'
      AND is_deleted = false;

    -- 3. Log an activity
    INSERT INTO public.activities (
        organization_id,
        supervisor_id,
        type,
        message,
        icon
    )
    VALUES (
        _org_id,
        _supervisor_id,
        'payment',
        'Bulk settlement of ₹' || _amount || ' completed',
        '💰'
    );

    RETURN _payment_id;
END;
$$;

-- 2. Add Anomaly Flags View for Auditors
CREATE OR REPLACE VIEW public.flagged_work_entries AS
SELECT 
    we.*,
    l.name as labourer_name,
    p.name as project_name
FROM public.work_entries we
JOIN public.labourers l ON we.labourer_id = l.id
LEFT JOIN public.projects p ON we.project_id = p.id
WHERE array_length(we.flags, 1) > 0;
