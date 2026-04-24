-- SQL script to set up Recycle Bin (Soft Delete) in ShramFlow

-- 1. Create the Trash table
CREATE TABLE IF NOT EXISTS trash (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    entity_type TEXT NOT NULL, -- 'Labourer', 'WorkEntry', 'Payment', 'Project', etc.
    entity_id UUID NOT NULL,
    data JSONB NOT NULL,
    deleted_by UUID,
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    is_restored BOOLEAN DEFAULT FALSE
);

-- 2. Add soft delete columns to existing tables
DO $$ 
BEGIN 
    -- Labourers
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'labourers' AND COLUMN_NAME = 'is_deleted') THEN
        ALTER TABLE labourers ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE labourers ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Work Entries
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'work_entries' AND COLUMN_NAME = 'is_deleted') THEN
        ALTER TABLE work_entries ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE work_entries ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Payments
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'is_deleted') THEN
        ALTER TABLE payments ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE payments ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Projects
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'projects' AND COLUMN_NAME = 'is_deleted') THEN
        ALTER TABLE projects ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE projects ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;

    -- Work Disputes
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'work_disputes' AND COLUMN_NAME = 'is_deleted') THEN
        ALTER TABLE work_disputes ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
        ALTER TABLE work_disputes ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trash_org ON trash(organization_id);
CREATE INDEX IF NOT EXISTS idx_labourers_deleted ON labourers(is_deleted);
CREATE INDEX IF NOT EXISTS idx_work_entries_deleted ON work_entries(is_deleted);
