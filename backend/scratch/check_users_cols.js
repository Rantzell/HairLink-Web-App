const { Client } = require('pg');
const client = new Client({ connectionString: "postgresql://postgres.vitvtysmorwrvyzjqbyr:fartexhhairlink@aws-1-ap-south-1.pooler.supabase.com:5432/postgres" });

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
    AND column_name IN ('age', 'gender', 'phone');
  `);
  console.log("Columns in users table:");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
