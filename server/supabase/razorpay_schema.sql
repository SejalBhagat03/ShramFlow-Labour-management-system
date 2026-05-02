-- Create payments table with Razorpay integration details
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'bank', 'manual_upi', 'razorpay')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    razorpay_order_id TEXT UNIQUE, -- Nullable for manual payments
    razorpay_payment_id TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    payment_verified_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Supervisors view all payments" ON public.payments;
CREATE POLICY "Supervisors view all payments" ON public.payments
    FOR SELECT USING (
        public.has_role(auth.uid(), 'supervisor') OR 
        public.has_role(auth.uid(), 'admin')
    );

DROP POLICY IF EXISTS "Labourers view own payments" ON public.payments;
CREATE POLICY "Labourers view own payments" ON public.payments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.labourers WHERE id = labourer_id
        )
    );

-- Trigger: Auto-Debit on Payment (ONLY when status is 'paid')
CREATE OR REPLACE FUNCTION public.handle_payment_made()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only insert into ledger if status is 'paid'
    -- This handles initial manual 'paid' inserts AND Razorpay 'pending' -> 'paid' updates
    -- check OLD.status != 'paid' to prevent duplicate entries on subsequent updates
    IF (NEW.status = 'paid' AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'paid'))) THEN
        -- Extra safety: Check if ledger entry already exists for this payment_id
        IF NOT EXISTS (SELECT 1 FROM public.labour_ledger WHERE reference_id = NEW.id) THEN
            INSERT INTO public.labour_ledger (labourer_id, transaction_type, amount, description, reference_id)
            VALUES (
                NEW.labourer_id, 
                'DEBIT', 
                NEW.amount, 
                'Payment Made (' || NEW.method || ')', 
                NEW.id
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_made ON public.payments;
CREATE TRIGGER on_payment_made
    AFTER INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.handle_payment_made();

-- Grant Permissions
GRANT SELECT ON public.payments TO authenticated;
