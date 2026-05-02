-- 1. Create labour_ledger table
CREATE TABLE IF NOT EXISTS public.labour_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(10,2) NOT NULL,
    description TEXT,
    reference_id UUID, -- Can be work_entry_id or payment_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.labour_ledger ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Supervisors can view entire ledger" 
ON public.labour_ledger FOR SELECT 
TO authenticated 
USING (has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Labourers can view own ledger" 
ON public.labour_ledger FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.labourers 
        WHERE labourers.id = labour_ledger.labourer_id 
        AND labourers.user_id = auth.uid()
    )
);

-- 2. Update labourers table
ALTER TABLE public.labourers 
ADD COLUMN IF NOT EXISTS rate_per_meter NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS fraud_score INTEGER DEFAULT 0;

-- 3. Update work_entries table (Using `work_entries` as confirmed active table)
ALTER TABLE public.work_entries 
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC,
ADD COLUMN IF NOT EXISTS wage_amount NUMERIC(10,2) DEFAULT 0;

-- 4. Function: Calculate Wage & Update Ledger on Work Entry
CREATE OR REPLACE FUNCTION public.handle_work_entry_wage()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rate NUMERIC;
    v_wage NUMERIC;
begin
    -- Only proceed if wage_amount is 0 or null (allow manual override if needed)
    IF NEW.wage_amount IS NULL OR NEW.wage_amount = 0 THEN
         -- Get rate from labourer
        SELECT rate_per_meter INTO v_rate 
        FROM public.labourers 
        WHERE id = NEW.labourer_id;

        -- Calculate wage: meters * rate
        -- If meters is null, fallback to amount if provided, or 0
        IF NEW.meters IS NOT NULL AND v_rate > 0 THEN
            v_wage := NEW.meters * v_rate;
        ELSE
            -- Fallback: if amount was manually entered, use it. Else 0.
            v_wage := NEW.amount;
        END IF;

        NEW.wage_amount := v_wage;
        -- Also update the main 'amount' field if it was 0, to keep compatibility
        IF NEW.amount = 0 THEN
             NEW.amount := v_wage;
        END IF;
    ELSE 
        v_wage := NEW.wage_amount;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger for Wage Calc (Before Insert)
DROP TRIGGER IF EXISTS trigger_calculate_wage ON public.work_entries;
CREATE TRIGGER trigger_calculate_wage
BEFORE INSERT ON public.work_entries
FOR EACH ROW
EXECUTE FUNCTION public.handle_work_entry_wage();

-- 5. Function: Add Work to Ledger (After Insert)
CREATE OR REPLACE FUNCTION public.sync_work_to_ledger()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
    VALUES (
        NEW.labourer_id, 
        'CREDIT', 
        NEW.amount, 
        'Work Entry: ' || NEW.task_type || ' (' || COALESCE(NEW.date::text, 'Unknown Date') || ')', 
        NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_work_ledger ON public.work_entries;
CREATE TRIGGER trigger_work_ledger
AFTER INSERT ON public.work_entries
FOR EACH ROW
EXECUTE FUNCTION public.sync_work_to_ledger();

-- 6. Function: Add Payment to Ledger (After Insert)
CREATE OR REPLACE FUNCTION public.sync_payment_to_ledger()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
    VALUES (
        NEW.labourer_id, 
        'DEBIT', 
        NEW.amount, 
        'Payment: ' || NEW.method, 
        NEW.id
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_payment_ledger ON public.payments;
CREATE TRIGGER trigger_payment_ledger
AFTER INSERT ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.sync_payment_to_ledger();

-- 7. Update Fraud Score on Dispute
-- Assuming work_disputes exists from previous migration (20260206)
-- We'll attach a trigger there.
CREATE OR REPLACE FUNCTION public.increment_fraud_score()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If high discrepancy (>20%), increase fraud score
    IF NEW.difference_percent > 20 THEN
        UPDATE public.labourers
        SET fraud_score = fraud_score + 10
        WHERE id = NEW.labourer_id;
    END IF;
    RETURN NEW;
END;
$$;

-- Note: references work_disputes which should exist. 
-- If previous migration failed, this might fail unless we ensure existence.
-- We'll assume existence based on file history.
DROP TRIGGER IF EXISTS trigger_fraud_score ON public.work_disputes;
CREATE TRIGGER trigger_fraud_score
AFTER INSERT ON public.work_disputes
FOR EACH ROW
EXECUTE FUNCTION public.increment_fraud_score();
