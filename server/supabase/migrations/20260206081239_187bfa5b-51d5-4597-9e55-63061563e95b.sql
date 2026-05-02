-- Create storage bucket for work evidence photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('work-evidence', 'work-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for work-evidence bucket
CREATE POLICY "Anyone can view work evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'work-evidence');

CREATE POLICY "Authenticated users can upload work evidence"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'work-evidence');

CREATE POLICY "Users can update their own evidence"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'work-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own evidence"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'work-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create work_claims table for labourer-submitted work claims
CREATE TABLE public.work_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  claimed_meters NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  photo_url_after TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  location_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'disputed', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(labourer_id, date)
);

-- Create work_disputes table for tracking mismatches
CREATE TABLE public.work_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_claim_id UUID REFERENCES public.work_claims(id) ON DELETE SET NULL,
  daily_work_id UUID REFERENCES public.daily_work_register(id) ON DELETE SET NULL,
  labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  claimed_meters NUMERIC NOT NULL DEFAULT 0,
  supervisor_meters NUMERIC NOT NULL DEFAULT 0,
  difference_percent NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'rejected')),
  resolution_notes TEXT,
  final_meters NUMERIC,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create work_acknowledgments table for labourer confirmations
CREATE TABLE public.work_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_work_id UUID NOT NULL REFERENCES public.daily_work_register(id) ON DELETE CASCADE,
  labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  dispute_reason TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(daily_work_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.work_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_acknowledgments ENABLE ROW LEVEL SECURITY;

-- RLS policies for work_claims
CREATE POLICY "Labourers can create their own claims"
ON public.work_claims FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_claims.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Labourers can view their own claims"
ON public.work_claims FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_claims.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Labourers can update their pending claims"
ON public.work_claims FOR UPDATE
TO authenticated
USING (
  status = 'pending' AND
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_claims.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can view all claims"
ON public.work_claims FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Supervisors can update claims"
ON public.work_claims FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

-- RLS policies for work_disputes
CREATE POLICY "Labourers can view their disputes"
ON public.work_disputes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_disputes.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage all disputes"
ON public.work_disputes FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

-- RLS policies for work_acknowledgments
CREATE POLICY "Labourers can view their acknowledgments"
ON public.work_acknowledgments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_acknowledgments.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Labourers can update their acknowledgments"
ON public.work_acknowledgments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM labourers 
    WHERE labourers.id = work_acknowledgments.labourer_id 
    AND labourers.user_id = auth.uid()
  )
);

CREATE POLICY "Supervisors can manage acknowledgments"
ON public.work_acknowledgments FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'supervisor'));

-- Create trigger to auto-create acknowledgment when daily work is created
CREATE OR REPLACE FUNCTION public.create_work_acknowledgment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO work_acknowledgments (daily_work_id, labourer_id)
  VALUES (NEW.id, NEW.labourer_id)
  ON CONFLICT (daily_work_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_acknowledgment
AFTER INSERT ON public.daily_work_register
FOR EACH ROW
EXECUTE FUNCTION public.create_work_acknowledgment();

-- Create function to check for disputes when claim or supervisor entry is made
CREATE OR REPLACE FUNCTION public.check_work_dispute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claim_meters NUMERIC;
  v_supervisor_meters NUMERIC;
  v_difference NUMERIC;
  v_claim_id UUID;
  v_work_id UUID;
BEGIN
  -- Get matching claim for the date
  SELECT id, claimed_meters INTO v_claim_id, v_claim_meters
  FROM work_claims
  WHERE labourer_id = NEW.labourer_id AND date = NEW.date;
  
  -- Get supervisor entry
  SELECT id, meters INTO v_work_id, v_supervisor_meters
  FROM daily_work_register
  WHERE labourer_id = NEW.labourer_id AND date = NEW.date;
  
  -- If both exist, check for mismatch
  IF v_claim_meters IS NOT NULL AND v_supervisor_meters IS NOT NULL THEN
    -- Calculate percentage difference
    IF v_supervisor_meters > 0 THEN
      v_difference := ABS((v_claim_meters - v_supervisor_meters) / v_supervisor_meters * 100);
    ELSIF v_claim_meters > 0 THEN
      v_difference := 100;
    ELSE
      v_difference := 0;
    END IF;
    
    -- If difference > 10%, create dispute
    IF v_difference > 10 THEN
      INSERT INTO work_disputes (
        work_claim_id, daily_work_id, labourer_id, date,
        claimed_meters, supervisor_meters, difference_percent
      )
      VALUES (
        v_claim_id, v_work_id, NEW.labourer_id, NEW.date,
        v_claim_meters, v_supervisor_meters, v_difference
      )
      ON CONFLICT DO NOTHING;
      
      -- Update claim status
      UPDATE work_claims SET status = 'disputed' WHERE id = v_claim_id;
    ELSE
      -- Mark as matched
      UPDATE work_claims SET status = 'matched' WHERE id = v_claim_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger on work_claims insert/update
CREATE TRIGGER trigger_check_dispute_on_claim
AFTER INSERT OR UPDATE ON public.work_claims
FOR EACH ROW
EXECUTE FUNCTION public.check_work_dispute();

-- Trigger on daily_work_register insert/update  
CREATE TRIGGER trigger_check_dispute_on_work
AFTER INSERT OR UPDATE ON public.daily_work_register
FOR EACH ROW
EXECUTE FUNCTION public.check_work_dispute();

-- Add updated_at triggers
CREATE TRIGGER update_work_claims_updated_at
BEFORE UPDATE ON public.work_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_disputes_updated_at
BEFORE UPDATE ON public.work_disputes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_work_acknowledgments_updated_at
BEFORE UPDATE ON public.work_acknowledgments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();