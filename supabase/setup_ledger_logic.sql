-- Running Ledger System Logic
-- Automates financial tracking between Work Entries (Credit) and Payments (Debit)

-- 1. Ensure Ledger Table Exists
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')), -- CREDIT = Work Done (Earnings), DEBIT = Paid/Advance (Deduction)
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Links to work_entries.id or payments.id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.labour_ledger ENABLE ROW LEVEL SECURITY;

-- 2. Function to Calculate Live Balance
-- Returns positive if we owe them (Pending Wages)
-- Returns negative if they owe us (Advance Balance)
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

-- 3. Trigger: Auto-Credit on Work Approval
CREATE OR REPLACE FUNCTION public.handle_work_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only run if status changed to 'approved' OR new row is 'approved'
    IF (TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved') OR
       (TG_OP = 'INSERT' AND NEW.status = 'approved') THEN
       
        INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
        VALUES (
            NEW.labourer_id, 
            'CREDIT', 
            NEW.amount, 
            COALESCE(NEW.description, 'Work Approved: ' || NEW.task_type), 
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_work_approved ON public.work_entries;
CREATE TRIGGER on_work_approved
    AFTER INSERT OR UPDATE ON public.work_entries
    FOR EACH ROW EXECUTE FUNCTION public.handle_work_approval();

-- 4. Trigger: Auto-Debit on Payment
CREATE OR REPLACE FUNCTION public.handle_payment_made()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Assuming payments are always 'completed' or valid for deduction upon creation
    -- If you leverage status for payments, wrap in IF check similar to above
    
    INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
    VALUES (
        NEW.labourer_id, 
        'DEBIT', 
        NEW.amount, 
        'Payment/Advance Given', 
        NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_made ON public.payments;
CREATE TRIGGER on_payment_made
    AFTER INSERT ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_payment_made();

-- 5. RLS Policies for Ledger
DROP POLICY IF EXISTS "Supervisors view ledger" ON public.labour_ledger;
CREATE POLICY "Supervisors view ledger" ON public.labour_ledger
    FOR ALL USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- 6. Reload Cache
NOTIFY pgrst, 'reload config';
