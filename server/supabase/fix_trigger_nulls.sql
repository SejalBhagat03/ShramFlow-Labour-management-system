-- FIX TRIGGERS TO HANDLE NULLS (Prevents 400 Error on Approve)
-- If work_entries.amount is NULL, the trigger failed because labour_ledger.amount is NOT NULL.

-- 1. Backfill NULL amounts in work_entries to 0
UPDATE public.work_entries SET amount = 0 WHERE amount IS NULL;

-- 2. Update Work Approval Trigger to be safe
CREATE OR REPLACE FUNCTION public.handle_work_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
       
        INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
        VALUES (
            NEW.labourer_id, 
            'CREDIT', 
            COALESCE(NEW.amount, 0), -- Handle NULL amount
            COALESCE(NEW.description, 'Work Approved: ' || COALESCE(NEW.task_type, 'Unknown')), 
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Update Payment Trigger to be safe
CREATE OR REPLACE FUNCTION public.handle_payment_made()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
    VALUES (
        NEW.labourer_id, 
        'DEBIT', 
        COALESCE(NEW.amount, 0), 
        COALESCE(NEW.notes, 'Payment Made'), 
        NEW.id
    );
    RETURN NEW;
END;
$$;

-- 4. Reload cache
NOTIFY pgrst, 'reload config';
