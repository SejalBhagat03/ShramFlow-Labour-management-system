const fs = require('fs');
const url = 'https://lmpdptbtiqqqlsrzagrh.supabase.co/rest/v1';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtcGRwdGJ0aXFxcWxzcnphZ3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4NTk5MDAsImV4cCI6MjA4NjQzNTkwMH0._ueI1EM6CMdMKff_HVJxU2sXAKiXJuEgtky_46CUu34';

async function checkTable(tableName) {
    try {
        const res = await fetch(`${url}/${tableName}?select=*&limit=1`, {
            headers: {
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`
            }
        });
        return `Table: ${tableName} -> Status: ${res.status} ${res.statusText}\n`;
    } catch (e) {
        return `Table: ${tableName} -> Error: ${e.message}\n`;
    }
}

async function main() {
    let output = '';
    output += await checkTable('work_acknowledgments');
    output += await checkTable('work_disputes');
    output += await checkTable('work_claims');
    output += await checkTable('daily_work_register');
    output += await checkTable('work_entries');
    
    fs.writeFileSync('table_test_results.txt', output);
    console.log('Results written to table_test_results.txt');
}

main();
