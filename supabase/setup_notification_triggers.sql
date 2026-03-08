-- NOTIFICATION TRIGGERS
-- Run this in Supabase SQL Editor

-- 1. Function to notify supervisors of new advance request
CREATE OR REPLACE FUNCTION public.notify_supervisors_new_advance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supervisor_rec RECORD;
BEGIN
  -- Find all supervisors
  FOR supervisor_rec IN 
    SELECT user_id FROM public.user_roles WHERE role IN ('supervisor', 'admin')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, message, action_url, created_at)
    VALUES (
      supervisor_rec.user_id, 
      'payment_request', 
      'New Advance Request', 
      'A labourer has requested an advance of ₹' || NEW.amount, 
      '/payments', -- Assuming this is where they approve it
      NOW()
    );
  END LOOP;
  RETURN NEW;
END;
$$;

-- Trigger for new advance request
DROP TRIGGER IF EXISTS on_advance_request_created ON public.advance_requests;
CREATE TRIGGER on_advance_request_created
  AFTER INSERT ON public.advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_supervisors_new_advance();


-- 2. Function to notify labourer of advance approval
CREATE OR REPLACE FUNCTION public.notify_labourer_advance_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  labourer_user_id UUID;
BEGIN
  -- Only notify if status changed to approved or rejected
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    -- Get the auth user_id of the labourer
    SELECT user_id INTO labourer_user_id FROM public.labourers WHERE id = NEW.labourer_id;
    
    IF labourer_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, created_at)
      VALUES (
        labourer_user_id,
        'info',
        'Advance Request ' || INITCAP(NEW.status),
        'Your advance request for ₹' || NEW.amount || ' has been ' || NEW.status,
        NOW()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for advance update
DROP TRIGGER IF EXISTS on_advance_request_updated ON public.advance_requests;
CREATE TRIGGER on_advance_request_updated
  AFTER UPDATE ON public.advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_labourer_advance_update();


-- 3. Function to notify labourer of new payment
-- Assuming 'payments' table exists as per previous context
CREATE OR REPLACE FUNCTION public.notify_labourer_payment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  labourer_user_id UUID;
BEGIN
  -- Get the auth user_id of the labourer
  SELECT user_id INTO labourer_user_id FROM public.labourers WHERE id = NEW.labourer_id;
  
  IF labourer_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, created_at)
    VALUES (
      labourer_user_id,
      'payment_approved',
      'Payment Received',
      'You have received a payment of ₹' || NEW.amount,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for new payment
-- Checks if table exists first to avoid error if script run blindly
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
    DROP TRIGGER IF EXISTS on_payment_created ON public.payments;
    CREATE TRIGGER on_payment_created
      AFTER INSERT ON public.payments
      FOR EACH ROW EXECUTE FUNCTION public.notify_labourer_payment_received();
  END IF;
END
$$;
