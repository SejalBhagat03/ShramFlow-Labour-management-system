-- Upgrade Ledger to Transaction Engine
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'payment';
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Update categories for existing rows
UPDATE public.labour_ledger SET category = 'work' WHERE transaction_type = 'CREDIT';
UPDATE public.labour_ledger SET category = 'payment' WHERE transaction_type = 'DEBIT' AND category IS NULL;

-- Improved Work Approval Trigger to include 'work' category
CREATE OR REPLACE FUNCTION public.handle_work_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
       
        INSERT INTO public.labour_ledger (labourer_id, transaction_type, category, amount, description, reference_id, metadata)
        VALUES (
            NEW.labourer_id, 
            'CREDIT', 
            'work',
            NEW.amount, 
            COALESCE(NEW.description, 'Work Approved: ' || NEW.task_type), 
            NEW.id,
            jsonb_build_object('project_id', NEW.project_id, 'date', NEW.date)
        );
    END IF;
    RETURN NEW;
END;
$$;

-- Improved Payment Trigger to distinguish between 'payment' and 'advance'
CREATE OR REPLACE FUNCTION public.handle_payment_made()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.labour_ledger (labourer_id, transaction_type, category, amount, description, reference_id, metadata)
    VALUES (
        NEW.labourer_id, 
        'DEBIT', 
        COALESCE(NEW.payment_type, 'payment'), -- Use payment_type if exists
        NEW.amount, 
        'Payment/Advance Recorded', 
        NEW.id,
        jsonb_build_object('method', NEW.method, 'date', NEW.transaction_date)
    );
    RETURN NEW;
END;
$$;

-- ==========================================
-- INITIAL BACKFILL: Sync existing data
-- ==========================================

-- 1. Backfill approved work entries
INSERT INTO public.labour_ledger (labourer_id, transaction_type, category, amount, description, reference_id, metadata, created_at)
SELECT 
    labourer_id, 
    'CREDIT', 
    'work', 
    amount, 
    'Historical Work: ' || task_type, 
    id, 
    jsonb_build_object('project_id', project_id, 'date', date),
    created_at
FROM public.work_entries
WHERE status IN ('approved', 'paid')
AND NOT EXISTS (SELECT 1 FROM public.labour_ledger WHERE reference_id = public.work_entries.id);

-- 2. Backfill paid payments
INSERT INTO public.labour_ledger (labourer_id, transaction_type, category, amount, description, reference_id, metadata, created_at)
SELECT 
    labourer_id, 
    'DEBIT', 
    COALESCE(payment_type, 'payment'), 
    amount, 
    'Historical Payment Recorded', 
    id, 
    jsonb_build_object('method', method, 'date', transaction_date),
    created_at
FROM public.payments
WHERE status = 'paid'
AND NOT EXISTS (SELECT 1 FROM public.labour_ledger WHERE reference_id = public.payments.id);
