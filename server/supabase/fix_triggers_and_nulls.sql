-- FIX TRIGGERS TO HANDLE NULL VALUES ROBUSTLY

-- 1. DROP EXISTING TRIGGERS TO PREVENT CONFLICTS
DROP TRIGGER IF EXISTS on_work_approved ON public.work_entries;
DROP TRIGGER IF EXISTS on_payment_made ON public.payments;

-- 2. BACKFILL NULL AMOUNTS IN WORK_ENTRIES
-- This is crucial because if we update a row with NULL amount, the trigger might fail
UPDATE public.work_entries SET amount = 0 WHERE amount IS NULL;

-- 3. ENSURE LABOUR_LEDGER EXISTS
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. RECREATE WORK APPROVAL FUNCTION WITH SAFETY CHECKS
CREATE OR REPLACE FUNCTION public.handle_work_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    safe_amount NUMERIC;
    safe_desc TEXT;
BEGIN
    -- Only run if status changed to 'approved' OR new row is 'approved'
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
       
       -- Safe values
       safe_amount := COALESCE(NEW.amount, 0);
       safe_desc := COALESCE(NEW.description, 'Work Approved: ' || COALESCE(NEW.task_type, 'Unknown'));

        INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
        VALUES (
            NEW.labourer_id, 
            'CREDIT', 
            safe_amount, 
            safe_desc, 
            NEW.id
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If trigger fails, Log it but don't block the transaction (optional, but good for debugging)
    -- For now we allow failure but we made it robust so it shouldn't fail.
    RAISE WARNING 'Work Approval Trigger Failed: %', SQLERRM;
    RETURN NEW; 
END;
$$;

-- 5. RECREATE TRIGGER FOR WORK APPROVAL
CREATE TRIGGER on_work_approved
    AFTER INSERT OR UPDATE ON public.work_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_work_approval();

-- 6. RECREATE PAYMENT FUNCTION WITH SAFETY CHECKS
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
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Payment Trigger Failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 7. RECREATE TRIGGER FOR PAYMENT
CREATE TRIGGER on_payment_made
    AFTER INSERT ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_payment_made();

-- 8. FORCE CACHE RELOAD
NOTIFY pgrst, 'reload config';
