<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            // Drop all policies on monetary_donations
            DB::statement("
                DO $$
                DECLARE
                    pol RECORD;
                BEGIN
                    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'monetary_donations' LOOP
                        EXECUTE format('DROP POLICY %I ON monetary_donations', pol.policyname);
                    END LOOP;
                END
                $$;
            ");

            // Drop existing foreign key constraint if any
            DB::statement('ALTER TABLE monetary_donations DROP CONSTRAINT IF EXISTS monetary_donations_user_id_foreign');

            // Drop NOT NULL if it exists
            DB::statement('ALTER TABLE monetary_donations ALTER COLUMN user_id DROP NOT NULL');

            // Convert UUID to bigint (wipe incompatible values using USING NULL)
            DB::statement('ALTER TABLE monetary_donations ALTER COLUMN user_id TYPE bigint USING NULL');

            // Re-add foreign key as nullable
            DB::statement('ALTER TABLE monetary_donations ADD CONSTRAINT monetary_donations_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
        }
    }

    public function down(): void
    {
        // Intentionally left blank — no safe rollback from bigint to uuid
    }
};
