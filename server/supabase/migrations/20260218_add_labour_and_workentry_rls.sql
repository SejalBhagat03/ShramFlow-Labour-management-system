-- Add policies allowing labourers to access their own records in labourers and work_entries tables

-- LABOURERS: allow a labourer to select/update/insert/delete their own row (useful for portal and trust score)
DROP POLICY IF EXISTS "Labourers can manage own record" ON public.labourers;
CREATE POLICY "Labourers can manage own record" ON public.labourers
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- WORK ENTRIES: allow a labourer to create and view entries tied to their labourer record
DROP POLICY IF EXISTS "Labourers manage own work" ON public.work_entries;
CREATE POLICY "Labourers manage own work" ON public.work_entries
  FOR ALL USING (
      labourer_id = (
          SELECT id FROM public.labourers WHERE user_id = auth.uid()
      )
  )
  WITH CHECK (
      labourer_id = (
          SELECT id FROM public.labourers WHERE user_id = auth.uid()
      )
  );

-- Supervisors/admins should also be able to manage assignments
DROP POLICY IF EXISTS "Supervisors manage assignments" ON public.work_assignments;
CREATE POLICY "Supervisors manage assignments" ON public.work_assignments
  FOR ALL USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

-- Labourers may see/insert/update their own assignments (table uses `labour_id` column)
DROP POLICY IF EXISTS "Labourers can view own assignments" ON public.work_assignments;
CREATE POLICY "Labourers can view own assignments" ON public.work_assignments
  FOR ALL USING (
      labour_id = (
          SELECT id FROM public.labourers WHERE user_id = auth.uid()
      )
  )
  WITH CHECK (
      labour_id = (
          SELECT id FROM public.labourers WHERE user_id = auth.uid()
      )
  );

-- (supervisors/admins continue to use existing "Supervisors manage work" and "Supervisors manage labourers" policies)
