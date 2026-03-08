-- PRODUCTION HARDENING: DATABASE-SIDE BUSINESS LOGIC
-- Porting frontend services to SQL triggers for security and integrity.

-- 1. Function: Automated Daily Log & Activity Generation
CREATE OR REPLACE FUNCTION public.proc_on_work_entry_created()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_trust_score INTEGER := 70;
    v_trust_label TEXT := 'Medium';
    v_hour INTEGER;
BEGIN
    -- 1. CALCULATE INLINE RELIABILITY (Trust Score Logic)
    v_hour := EXTRACT(HOUR FROM COALESCE(NEW.created_at, now()));
    
    -- Baseline calculation (Simple production-ready version)
    IF v_hour >= 6 AND v_hour <= 20 THEN
        v_trust_score := v_trust_score + 20; -- +20 for daytime entry
    END IF;
    
    IF NEW.date = CURRENT_DATE THEN
        v_trust_score := v_trust_score + 10; -- +10 for same-day entry
    END IF;
    
    v_trust_score := LEAST(v_trust_score, 100);
    v_trust_label := CASE 
        WHEN v_trust_score >= 80 THEN 'High'
        WHEN v_trust_score >= 50 THEN 'Medium'
        ELSE 'Low'
    END;

    -- 2. CREATE AUTOMATED LOG (LogSync Logic)
    INSERT INTO public.daily_logs (
        user_id, 
        labourer_id, 
        date, 
        title, 
        description, 
        log_type, 
        metadata
    ) VALUES (
        NEW.supervisor_id,
        NEW.labourer_id,
        NEW.date,
        'Work Registry: ' || NEW.task_type,
        format('Automated Registry: %s work recorded. Reliability Index: %s (%s%%)', 
               COALESCE(NEW.meters::text, NEW.hours::text, 'Unit'), 
               v_trust_label, 
               v_trust_score),
        'proof',
        jsonb_build_object(
            'work_entry_id', NEW.id,
            'reliability_score', v_trust_score,
            'submission_hour', v_hour
        )
    );

    -- 3. CREATE GLOBAL ACTIVITY
    INSERT INTO public.activities (
        supervisor_id,
        type,
        message,
        icon
    ) VALUES (
        NEW.supervisor_id,
        'work_entry',
        format('Work entry recorded for labourer ID: %s', NEW.labourer_id),
        'briefcase'
    );

    -- 4. UPDATE LABOURER RELIABILITY INDEX
    UPDATE public.labourers
    SET 
        trust_score = ROUND((COALESCE(trust_score, 70) * 0.8) + (v_trust_score * 0.2)),
        trust_badge = CASE 
            WHEN ROUND((COALESCE(trust_score, 70) * 0.8) + (v_trust_score * 0.2)) >= 85 THEN 'trusted'
            WHEN ROUND((COALESCE(trust_score, 70) * 0.8) + (v_trust_score * 0.2)) < 50 THEN 'needs_review'
            ELSE 'normal'
        END
    WHERE id = NEW.labourer_id;

    RETURN NEW;
END;
$$;

-- Trigger for Work Entry Creation
DROP TRIGGER IF EXISTS trigger_work_entry_created ON public.work_entries;
CREATE TRIGGER trigger_work_entry_created
AFTER INSERT ON public.work_entries
FOR EACH ROW
EXECUTE FUNCTION public.proc_on_work_entry_created();

-- 2. ADD PRODUCTION CONSTRAINTS
ALTER TABLE public.work_entries 
ALTER COLUMN supervisor_id SET NOT NULL,
ALTER COLUMN labourer_id SET NOT NULL,
ALTER COLUMN date SET NOT NULL;

ALTER TABLE public.labourers
ADD CONSTRAINT chk_phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$');

-- 3. HARDEN RLS POLICIES
-- Ensure supervisors ONLY see THEIR own labourers
DROP POLICY IF EXISTS "Supervisors manage labourers" ON public.labourers;
CREATE POLICY "Supervisors manage labourers" ON public.labourers
    FOR ALL USING (
        supervisor_id = auth.uid() OR 
        public.has_role(auth.uid(), 'admin')
    );

-- Ensure supervisors ONLY see THEIR own work entries
DROP POLICY IF EXISTS "Supervisors manage work" ON public.work_entries;
CREATE POLICY "Supervisors manage work" ON public.work_entries
    FOR ALL USING (
        supervisor_id = auth.uid() OR 
        public.has_role(auth.uid(), 'admin')
    );
