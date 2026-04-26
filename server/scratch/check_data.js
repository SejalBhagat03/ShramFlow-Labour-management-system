const supabase = require('../config/supabase');

async function checkData() {
    const orgId = '44088881-7961-4c87-947e-693f435a890c';
    
    const { data, error, count } = await supabase
        .from('labourers')
        .select('*', { count: 'exact' });
    
    console.log('Total workers in DB (all orgs):', count);
    
    const { data: orgData, count: orgCount } = await supabase
        .from('labourers')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId);
    
    console.log(`Workers for Org ${orgId}:`, orgCount);
    console.log('Last 3 workers:', orgData?.slice(-3).map(l => ({ name: l.name, org: l.organization_id })));

    const { data: nullOrgData, count: nullOrgCount } = await supabase
        .from('labourers')
        .select('*', { count: 'exact' })
        .is('organization_id', null);
    
    console.log('Workers with NULL organization_id:', nullOrgCount);
}

checkData();
