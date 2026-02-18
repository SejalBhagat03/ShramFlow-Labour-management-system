-- Migration: Add group_id to work_entries
-- Date: 2026-02-13

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'work_entries' 
        AND column_name = 'group_id'
    ) THEN
        ALTER TABLE public.work_entries 
        ADD COLUMN group_id UUID;
    END IF;
END $$;
