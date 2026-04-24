-- ==========================================
-- FIX: Create Missing Disputes Tables
-- ==========================================
-- Run this script in your Supabase SQL Editor to deploy the missing tables.
-- The previous migration failed because it referenced 'daily_work_register' 
-- instead of 'work_entries'.

----------------------------------------------
-- 1. Create work_claims Table
----------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_claims (
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

----------------------------------------------
-- 2. Create work_disputes Table
----------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_claim_id UUID REFERENCES public.work_claims(id) ON DELETE SET NULL,
  daily_work_id UUID REFERENCES public.work_entries(id) ON DELETE SET NULL, -- FIXED: work_entries
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

----------------------------------------------
-- 3. Create work_acknowledgments Table
----------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_work_id UUID NOT NULL REFERENCES public.work_entries(id) ON DELETE CASCADE, -- FIXED: work_entries
  labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  dispute_reason TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(daily_work_id)
);

----------------------------------------------
-- 4. Enable RLS and Setup Starter Policies
----------------------------------------------
ALTER TABLE public.work_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Allow select to supervisor
CREATE POLICY "Supervisors can view claims" ON public.work_claims FOR SELECT USING (has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can view disputes" ON public.work_disputes FOR SELECT USING (has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can view acknowledgments" ON public.work_acknowledgments FOR SELECT USING (has_role(auth.uid(), 'supervisor'));

-- Allow update to supervisor
CREATE POLICY "Supervisors can update claims" ON public.work_claims FOR UPDATE USING (has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can update disputes" ON public.work_disputes FOR UPDATE USING (has_role(auth.uid(), 'supervisor'));
CREATE POLICY "Supervisors can update acknowledgments" ON public.work_acknowledgments FOR ALL USING (has_role(auth.uid(), 'supervisor'));
