const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../server/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const labourerName = 'radha';
    
    // 1. Find Radha's ID
    const { data: labourer } = await supabase
        .from('labourers')
        .select('id')
        .eq('name', labourerName)
        .single();
    
    if (!labourer) {
        console.log('Labourer not found');
        return;
    }
    
    console.log(`Found Radha ID: ${labourer.id}`);
    
    // 2. Check Payments
    const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('labourer_id', labourer.id);
    
    console.log(`Payments found: ${payments?.length || 0}`);
    console.log(payments);
    
    // 3. Check Ledger
    const { data: ledger } = await supabase
        .from('labour_ledger')
        .select('*')
        .eq('labourer_id', labourer.id);
    
    console.log(`Ledger entries found: ${ledger?.length || 0}`);
    console.log(ledger);
}

check();
