const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vitvtysmorwrvyzjqbyr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpdHZ0eXNtb3J3cnZ5empxYnlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc4OTI2MiwiZXhwIjoyMDkwMzY1MjYyfQ._lxNIrywPyz6ln642aecXd47lIm5AG3PJPLQ6BKG4zI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking Database Tables ---');
    
    // Testing common tables
    const tables = ['profiles', 'hair_requests', 'donations', 'notifications'];
    
    for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
            console.log(`❌ Table "${table}" does not exist or error: ${error.message}`);
        } else {
            console.log(`✅ Table "${table}" exists!`);
        }
    }
}

checkTables();
