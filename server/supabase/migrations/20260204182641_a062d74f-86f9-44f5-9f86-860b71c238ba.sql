-- Create daily_logs table for day-wise photo uploads and notes
CREATE TABLE public.daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  labourer_id UUID REFERENCES public.labourers(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  log_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- Supervisors can manage all logs
CREATE POLICY "Supervisors can manage all logs"
ON public.daily_logs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'supervisor'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor'::app_role));

-- Labourers can view and create their own logs
CREATE POLICY "Labourers can view their own logs"
ON public.daily_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Labourers can create their own logs"
ON public.daily_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Labourers can update their own logs"
ON public.daily_logs
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Create storage bucket for daily log images
INSERT INTO storage.buckets (id, name, public) VALUES ('daily-logs', 'daily-logs', true);

-- Storage policies for daily-logs bucket
CREATE POLICY "Anyone can view daily log images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'daily-logs');

CREATE POLICY "Authenticated users can upload daily log images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'daily-logs');

CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'daily-logs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'daily-logs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_logs_updated_at
BEFORE UPDATE ON public.daily_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();