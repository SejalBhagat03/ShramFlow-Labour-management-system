-- SQL script to update triggers and functions to handle Soft Delete (Recycle Bin)
-- This ensures that deleted records don't affect live calculations or cause errors.

-- 1. Update handle_work_approval to ignore deleted labourers/entries
CREATE OR REPLACE FUNCTION public.handle_work_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the work entry or the labourer is marked as deleted
    -- This helps prevent approval of "trashed" records
    IF (SELECT is_deleted FROM public.labourers WHERE id = NEW.labourer_id) THEN
        RAISE EXCEPTION 'Cannot approve work for a deleted labourer.';
    END IF;

    -- Only run if status changed to 'approved' OR new row is 'approved'
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
       
        -- Ensure only for non-deleted entries
        IF NEW.is_deleted = FALSE THEN
            INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
            VALUES (
                NEW.labourer_id, 
                'CREDIT', 
                NEW.amount, 
                COALESCE(NEW.description, 'Work Approved: ' || NEW.task_type), 
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 2. Update get_labour_balance to ignore deleted ledger entries
-- (In case we also add is_deleted to ledger, for now we filter by reference source)
CREATE OR REPLACE FUNCTION get_labour_balance(labour_uuid UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    total_credit NUMERIC := 0;
    total_debit NUMERIC := 0;
BEGIN
    -- Join with source tables to ensure we don't count deleted records
    SELECT COALESCE(SUM(l.amount), 0) INTO total_credit 
    FROM public.labour_ledger l
    LEFT JOIN public.work_entries w ON l.reference_id = w.id
    WHERE l.labourer_id = labour_uuid 
    AND l.transaction_type = 'CREDIT'
    AND (w.id IS NULL OR w.is_deleted = FALSE);

    SELECT COALESCE(SUM(l.amount), 0) INTO total_debit 
    FROM public.labour_ledger l
    LEFT JOIN public.payments p ON l.reference_id = p.id
    WHERE l.labourer_id = labour_uuid 
    AND l.transaction_type = 'DEBIT'
    AND (p.id IS NULL OR p.is_deleted = FALSE);

    RETURN total_credit - total_debit;
END;
$$;

-- 3. Update increment_fraud_score to ignore deleted labourers
CREATE OR REPLACE FUNCTION public.increment_fraud_score()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only update if the labourer is NOT already deleted
    IF NEW.difference_percent > 20 THEN
        UPDATE public.labourers
        SET fraud_score = fraud_score + 10
        WHERE id = NEW.labourer_id AND is_deleted = FALSE;
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
