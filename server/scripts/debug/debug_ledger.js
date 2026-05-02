const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
    console.log(JSON.stringify(payments, null, 2));
    
    // 3. Check Ledger Table Schema
    const { data: schema, error: schemaError } = await supabase
        .from('labour_ledger')
        .select('*')
        .limit(1);
    
    if (schemaError) {
        console.error('Error fetching ledger schema:', schemaError);
    } else {
        console.log('Ledger table columns found:', schema.length > 0 ? Object.keys(schema[0]) : 'No rows to check columns');
    }

    // 4. Check Ledger entries
    const { data: ledger } = await supabase
        .from('labour_ledger')
        .select('*')
        .eq('labourer_id', labourer.id);
    
    console.log(`Ledger entries found: ${ledger?.length || 0}`);
    console.log(JSON.stringify(ledger, null, 2));
}

check();
