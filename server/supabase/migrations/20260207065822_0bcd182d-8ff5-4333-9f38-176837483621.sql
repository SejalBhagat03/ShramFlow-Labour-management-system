-- Fix RLS policies for trust_score_history table
DROP POLICY IF EXISTS "Supervisors can view trust score history" ON public.trust_score_history;
DROP POLICY IF EXISTS "System can insert trust score history" ON public.trust_score_history;

-- Supervisors can view trust score history
CREATE POLICY "Supervisors can view trust score history"
ON public.trust_score_history
FOR SELECT
USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Labourers can view their own trust score history
CREATE POLICY "Labourers can view their own trust score history"
ON public.trust_score_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM labourers 
  WHERE labourers.id = trust_score_history.labourer_id 
  AND labourers.user_id = auth.uid()
));

-- No direct inserts allowed - only through adjust_trust_score function (SECURITY DEFINER)