const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function diagnose() {
    console.log('--- FIXING DATA FOR ALL PROFILES ---');
    
    // 1. Get Default Org
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    const defOrgId = orgs?.[0]?.id;
    
    if (!defOrgId) {
        console.error('No organizations found!');
        return;
    }
    console.log('Default Org ID:', defOrgId);

    // 2. Link All Profiles
    const { error: profileErr } = await supabase
        .from('profiles')
        .update({ organization_id: defOrgId })
        .is('organization_id', null);
    console.log('Profiles Link:', profileErr ? `FAILED (${profileErr.message})` : 'SUCCESS');

    // 3. Link All Projects
    const { error: projectsErr } = await supabase
        .from('projects')
        .update({ organization_id: defOrgId })
        .is('organization_id', null);
    console.log('Projects Link:', projectsErr ? `FAILED (${projectsErr.message})` : 'SUCCESS');
}

diagnose();
