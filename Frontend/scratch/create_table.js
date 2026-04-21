const { Client } = require('pg');

async function createTable() {
    const connectionString = 'postgresql://postgres:Fartexh_db26@db.vitvtysmorwrvyzjqbyr.supabase.co:5432/postgres';
    const client = new Client({ connectionString });

    try {
        console.log('--- Connecting to Supabase via Postgres Protocol ---');
        await client.connect();
        console.log('✅ Connected!');

        const sql = `
            -- 1. Create the testing_donation table
            CREATE TABLE IF NOT EXISTS public.testing_donation (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                donor_name  TEXT NOT NULL,
                amount      NUMERIC NOT NULL,
                status      TEXT DEFAULT 'pending',
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );

            -- 2. Enable Security (RLS)
            ALTER TABLE public.testing_donation ENABLE ROW LEVEL SECURITY;

            -- 3. Create basic policies
            DROP POLICY IF EXISTS "Anyone can view" ON public.testing_donation;
            CREATE POLICY "Anyone can view" ON public.testing_donation FOR SELECT USING (true);

            DROP POLICY IF EXISTS "Anyone can insert" ON public.testing_donation;
            CREATE POLICY "Anyone can insert" ON public.testing_donation FOR INSERT WITH CHECK (true);
        `;

        await client.query(sql);
        console.log('✅ Success! Table "testing_donation" has been created.');

    } catch (err) {
        console.error('❌ Error creating table:', err.message);
    } finally {
        await client.end();
    }
}

createTable();
