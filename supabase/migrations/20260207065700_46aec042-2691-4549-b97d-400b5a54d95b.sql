-- Add trust_score column to labourers table
ALTER TABLE public.labourers 
ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 100,
ADD COLUMN IF NOT EXISTS trust_badge text NOT NULL DEFAULT 'normal' CHECK (trust_badge IN ('trusted', 'normal', 'needs_review'));

-- Create function to update trust badge based on score
CREATE OR REPLACE FUNCTION public.update_trust_badge()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trust_score >= 90 THEN
    NEW.trust_badge := 'trusted';
  ELSIF NEW.trust_score >= 60 THEN
    NEW.trust_badge := 'normal';
  ELSE
    NEW.trust_badge := 'needs_review';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to auto-update trust badge
DROP TRIGGER IF EXISTS update_labourer_trust_badge ON public.labourers;
CREATE TRIGGER update_labourer_trust_badge
BEFORE UPDATE OF trust_score ON public.labourers
FOR EACH ROW
EXECUTE FUNCTION public.update_trust_badge();

-- Create trust_score_history table for audit trail
CREATE TABLE IF NOT EXISTS public.trust_score_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  labourer_id uuid NOT NULL REFERENCES public.labourers(id) ON DELETE CASCADE,
  previous_score integer NOT NULL,
  new_score integer NOT NULL,
  change_reason text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('claim_confirmed', 'claim_disputed', 'fraud_flagged', 'dispute_resolved', 'manual_adjustment')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on trust_score_history
ALTER TABLE public.trust_score_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trust_score_history
CREATE POLICY "Supervisors can view trust score history"
ON public.trust_score_history
FOR SELECT
USING (true);

CREATE POLICY "System can insert trust score history"
ON public.trust_score_history
FOR INSERT
WITH CHECK (true);

-- Create function to adjust trust score and log history
CREATE OR REPLACE FUNCTION public.adjust_trust_score(
  p_labourer_id uuid,
  p_change integer,
  p_reason text,
  p_change_type text
)
RETURNS integer AS $$
DECLARE
  v_current_score integer;
  v_new_score integer;
BEGIN
  -- Get current score
  SELECT trust_score INTO v_current_score
  FROM public.labourers
  WHERE id = p_labourer_id;
  
  -- Calculate new score (clamp between 0 and 100)
  v_new_score := GREATEST(0, LEAST(100, v_current_score + p_change));
  
  -- Update labourer score
  UPDATE public.labourers
  SET trust_score = v_new_score
  WHERE id = p_labourer_id;
  
  -- Log history
  INSERT INTO public.trust_score_history (labourer_id, previous_score, new_score, change_reason, change_type)
  VALUES (p_labourer_id, v_current_score, v_new_score, p_reason, p_change_type);
  
  RETURN v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update work_claims to add sync_status for offline support
ALTER TABLE public.work_claims 
ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('pending', 'synced', 'failed')),
ADD COLUMN IF NOT EXISTS local_id text;

-- Create index for faster offline sync queries
CREATE INDEX IF NOT EXISTS idx_work_claims_sync_status ON public.work_claims(sync_status) WHERE sync_status != 'synced';