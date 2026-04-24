const { createClient } = require('@supabase/supabase-js');

const url = 'https://lmpdptbtiqqqlsrzagrh.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcGRwdGJ0aXFxcWxzcnphZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTk5MDAsImV4cCI6MjA4NjQzNTkwMH0._ueI1EM6CMdMKff_HVJxU2sXAKiXJuEgtky_46CUu34';

const supabase = createClient(url, anonKey);

async function main() {
    console.log('Testing .eq("organization_id", undefined)');
    const { data: d1, error: e1 } = await supabase
        .from('labourers')
        .select('id')
        .eq('organization_id', undefined); // JS undefined translates to what?
    
    if (e1) console.error('E1:', e1.message);
    else console.log('S1 Success:', d1.length);

    console.log('Testing .eq("organization_id", "undefined")');
    const { data: d2, error: e2 } = await supabase
        .from('labourers')
        .select('id')
        .eq('organization_id', 'undefined');
    
    if (e2) console.error('E2:', e2.message);
    else console.log('S2 Success:', d2.length);

    console.log('Testing .eq("organization_id", "null")');
    const { data: d3, error: e3 } = await supabase
        .from('labourers')
        .select('id')
        .eq('organization_id', 'null');
    
    if (e3) console.error('E3:', e3.message);
    else console.log('S3 Success:', d3.length);
}

main();
