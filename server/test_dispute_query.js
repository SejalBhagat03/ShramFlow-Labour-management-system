const { createClient } = require('@supabase/supabase-js');

const url = 'https://lmpdptbtiqqqlsrzagrh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcGRwdGJ0aXFxcWxzcnphZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTk5MDAsImV4cCI6MjA4NjQzNTkwMH0._ueI1EM6CMdMKff_HVJxU2sXAKiXJuEgtky_46CUu34';

const supabase = createClient(url, anonKey);

async function main() {
    const { data, error } = await supabase
        .from('work_acknowledgments')
        .select(`
            *,
            labourers:labourers!inner(id, name, name_hindi),
            daily_work:work_entries(id, date, meters, amount)
        `)
        .eq('status', 'disputed')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Query Error Details:', JSON.stringify(error, null, 2));
    } else {
        console.log('Query Success! Data count:', data.length);
    }
}

main();
