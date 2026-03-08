-- ENHANCED NOTIFICATIONS & PAYMENTS
-- Run this in Supabase SQL Editor

-- 1. Add column to link payments to advance requests
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS related_request_id UUID REFERENCES public.advance_requests(id);

-- 1.5 Add created_by column to payments
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Add metadata column to notifications for actionable data (JSONB)
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2.5 Ensure advance_requests has updated_at column
ALTER TABLE public.advance_requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 3. Function to Approve Advance & Create Payment Atomically
CREATE OR REPLACE FUNCTION public.approve_advance_request(
  p_request_id UUID,
  p_payment_method TEXT,
  p_payment_date DATE,
  p_supervisor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_payment_id UUID;
  v_labourer_user_id UUID;
BEGIN
  -- 1. Get the request details
  SELECT * INTO v_request FROM public.advance_requests WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request not found');
  END IF;

  IF v_request.status = 'approved' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Request already approved');
  END IF;

  -- 2. Update request status
  UPDATE public.advance_requests 
  SET status = 'approved', 
      updated_at = NOW()
  WHERE id = p_request_id;

  -- 3. Create Payment Record (Credit to Labourer)
  -- FIX: Status must be 'completed', NOT 'paid'
  INSERT INTO public.payments (
    labourer_id, 
    amount, 
    method, 
    date, 
    status, 
    related_request_id,
    created_by
  )
  VALUES (
    v_request.labourer_id,
    v_request.amount,
    p_payment_method,
    p_payment_date,
    'completed', -- CHANGED from 'paid' to 'completed' to match CHECK constraint
    p_request_id,
    p_supervisor_id
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'success', true, 
    'payment_id', v_payment_id,
    'message', 'Advance approved'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- 4. Update Trigger Function to include Metadata (Labourer Name, Request ID)
CREATE OR REPLACE FUNCTION public.notify_supervisors_new_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supervisor_rec RECORD;
  v_labourer_name TEXT;
BEGIN
  -- Get Labourer Name
  SELECT name INTO v_labourer_name FROM public.labourers WHERE id = NEW.labourer_id;

  -- Find all supervisors
  FOR supervisor_rec IN 
    SELECT user_id FROM public.user_roles WHERE role IN ('supervisor', 'admin')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata, created_at)
    VALUES (
      supervisor_rec.user_id, 
      'payment_request', 
      'New Advance Request', 
      v_labourer_name || ' requested ₹' || NEW.amount, 
      '/payments',
      jsonb_build_object(
        'request_id', NEW.id,
        'amount', NEW.amount,
        'labourer_id', NEW.labourer_id,
        'labourer_name', v_labourer_name
      ),
      NOW()
    );
  END LOOP;
  RETURN NEW;
END;
$$;
