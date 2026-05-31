const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT pol.polname, cls.relname AS table_name, pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relnamespace = 'public'::regnamespace
  `);
  console.log('Policies:');
  res.rows.forEach(r => console.log(r));
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
