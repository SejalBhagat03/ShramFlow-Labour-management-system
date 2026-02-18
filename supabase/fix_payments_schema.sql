-- FIX PAYMENTS TABLE SCHEMA
-- Error: "Could not find the 'date' column of 'payments' in the schema cache"

-- 1. Ensure 'date' column exists
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;

-- 2. Ensure 'transaction_date' column exists (good practice as it was in my previous scripts)
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3. Force Schema Cache Reload (Critical for this error)
NOTIFY pgrst, 'reload config';
