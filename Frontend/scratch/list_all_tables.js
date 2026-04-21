const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vitvtysmorwrvyzjqbyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdHZ0eXNtb3J3cnZ5empxYnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4OTI2MiwiZXhwIjoyMDkwMzY1MjYyfQ._lxNIrywPyz6ln642aecXd47lIm5AG3PJPLQ6BKG4zI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    console.log('--- Full Database Scan ---');
    try {
        // We fetch the OpenAPI spec from the root REST endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            headers: { 'apikey': supabaseKey }
        });
        const data = await response.json();
        
        if (data.definitions) {
            const tableNames = Object.keys(data.definitions);
            console.log('Tables found:', tableNames.length > 0 ? tableNames.join(', ') : 'None');
        } else {
            console.log('No table definitions found in API.');
        }
    } catch (err) {
        console.log('Error scanning:', err.message);
    }
}

listAllTables();
