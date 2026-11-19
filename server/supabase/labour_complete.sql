-- Practical labour profile and ledger completion
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'work';
ALTER TABLE public.labour_ledger ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.labourers ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.labourers ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE public.work_entries ADD COLUMN IF NOT EXISTS work_done NUMERIC(10,2);
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'advance';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS transaction_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_labour_ledger_labourer ON public.labour_ledger(labourer_id);
CREATE INDEX IF NOT EXISTS idx_work_entries_labourer ON public.work_entries(labourer_id);
CREATE INDEX IF NOT EXISTS idx_payments_labourer ON public.payments(labourer_id);

CREATE OR REPLACE FUNCTION public.sync_work_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' OR NEW.status = 'paid' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.labour_ledger
      WHERE reference_id = NEW.id AND transaction_type = 'CREDIT'
    ) THEN
      INSERT INTO public.labour_ledger
        (labourer_id, organization_id, transaction_type, category, amount, description, reference_id, metadata)
      VALUES
        (NEW.labourer_id, NEW.organization_id, 'CREDIT', 'work', COALESCE(NEW.amount, 0),
         'Work approved: ' || COALESCE(NEW.task_type, 'Daily work'), NEW.id,
         jsonb_build_object('date', NEW.date, 'meters', COALESCE(NEW.meters, NEW.work_done, 0), 'project_id', NEW.project_id));
    END IF;
  END IF;
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status NOT IN ('approved', 'paid') THEN
    DELETE FROM public.labour_ledger
    WHERE reference_id = NEW.id AND transaction_type = 'CREDIT';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_work_ledger ON public.work_entries;
CREATE TRIGGER trg_sync_work_ledger
AFTER INSERT OR UPDATE OF status, amount ON public.work_entries
FOR EACH ROW EXECUTE FUNCTION public.sync_work_ledger();

CREATE OR REPLACE FUNCTION public.sync_payment_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_type TEXT;
BEGIN
  IF NEW.status = 'paid' THEN
    v_type := COALESCE(NEW.payment_type, 'advance');
    IF NOT EXISTS (
      SELECT 1 FROM public.labour_ledger
      WHERE reference_id = NEW.id AND transaction_type = 'DEBIT'
    ) THEN
      INSERT INTO public.labour_ledger
        (labourer_id, organization_id, transaction_type, category, amount, description, reference_id, metadata)
      VALUES
        (NEW.labourer_id, NEW.organization_id, 'DEBIT', v_type, COALESCE(NEW.amount, 0),
         CASE v_type WHEN 'deduction' THEN 'Deduction recorded' ELSE 'Payment/advance recorded' END,
         NEW.id, jsonb_build_object('method', NEW.method, 'date', COALESCE(NEW.transaction_date, NEW.date)));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_payment_ledger ON public.payments;
CREATE TRIGGER trg_sync_payment_ledger
AFTER INSERT OR UPDATE OF status, amount, payment_type ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_payment_ledger();

CREATE OR REPLACE FUNCTION public.get_labour_balance(labour_uuid UUID)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(CASE WHEN transaction_type='CREDIT' THEN amount ELSE -amount END), 0)
  FROM public.labour_ledger WHERE labourer_id = labour_uuid
$$;

CREATE OR REPLACE FUNCTION public.get_labour_stats(labour_uuid UUID)
RETURNS JSONB LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'total_earned', COALESCE(SUM(CASE WHEN transaction_type='CREDIT' THEN amount ELSE 0 END), 0),
    'total_paid', COALESCE(SUM(CASE WHEN transaction_type='DEBIT' AND category='payment' THEN amount ELSE 0 END), 0),
    'total_advances', COALESCE(SUM(CASE WHEN transaction_type='DEBIT' AND category='advance' THEN amount ELSE 0 END), 0),
    'total_deductions', COALESCE(SUM(CASE WHEN transaction_type='DEBIT' AND category='deduction' THEN amount ELSE 0 END), 0)
  ) FROM public.labour_ledger WHERE labourer_id = labour_uuid
$$;

NOTIFY pgrst, 'reload schema';