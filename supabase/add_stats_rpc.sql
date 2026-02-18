-- RPC to get Total Earned and Total Paid for a labourer
CREATE OR REPLACE FUNCTION get_labour_stats(labour_uuid UUID)
RETURNS json
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    total_earned NUMERIC := 0;
    total_paid NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO total_earned 
    FROM public.labour_ledger 
    WHERE labourer_id = labour_uuid AND transaction_type = 'CREDIT';

    SELECT COALESCE(SUM(amount), 0) INTO total_paid 
    FROM public.labour_ledger 
    WHERE labourer_id = labour_uuid AND transaction_type = 'DEBIT';

    RETURN json_build_object(
        'total_earned', total_earned,
        'total_paid', total_paid
    );
END;
$$;

NOTIFY pgrst, 'reload config';
