-- Run this to see what columns actually exist in the database
SELECT column_name, data_type, ordinal_position
FROM information_schema.columns 
WHERE table_name = 'work_entries'
ORDER BY ordinal_position;
