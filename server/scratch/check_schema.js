const supabase = require('../config/supabase');

async function checkSchema() {
    try {
        const { data, error } = await supabase
            .from('labourers')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('Error fetching labourers:', error);
        } else {
            console.log('Columns in labourers:', data.length > 0 ? Object.keys(data[0]) : 'No data, checking RPC...');
        }

        // Try to get columns via a known trick
        const { data: rpcData, error: rpcErr } = await supabase.from('labourers').select().limit(0);
        console.log('Empty select keys:', Object.keys(rpcData || {}));
    } catch (e) {
        console.error('Crash:', e.message);
    }
}

checkSchema();
