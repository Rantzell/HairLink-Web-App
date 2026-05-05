const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres.vitvtysmorwrvyzjqbyr:fartexhhairlink@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'public';
  `);
  console.log("Functions in public schema:");
  console.log(JSON.stringify(res.rows, null, 2));
  
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_statement
    FROM information_schema.triggers;
  `);
  console.log("Triggers:");
  console.log(JSON.stringify(triggers.rows, null, 2));
  
  await client.end();
}
check();
