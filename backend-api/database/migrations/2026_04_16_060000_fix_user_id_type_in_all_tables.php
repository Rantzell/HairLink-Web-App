<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            $tables = [
                'donations',
                'hair_requests',
                'community_posts',
                'community_comments',
                'community_post_likes'
            ];

            foreach ($tables as $table) {
                // Drop policies first if they exist
                DB::statement("
                    DO $$
                    DECLARE
                        pol RECORD;
                    BEGIN
                        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = '{$table}' LOOP
                            EXECUTE format('DROP POLICY %I ON {$table}', pol.policyname);
                        END LOOP;
                    END
                    $$;
                ");

                // Drop foreign key
                DB::statement("ALTER TABLE {$table} DROP CONSTRAINT IF EXISTS {$table}_user_id_foreign");

                // Drop NOT NULL constraint if it exists (necessary for USING NULL cast)
                DB::statement("ALTER TABLE {$table} ALTER COLUMN user_id DROP NOT NULL");

                // Change type - UUID to BigInt conversion
                // WARNING: USING NULL was used which wipes existing data. 
                // Changed to try and be safer for repeated runs.
                DB::statement("
                    DO $$ 
                    BEGIN 
                        IF (SELECT data_type FROM information_schema.columns WHERE tablename = '{$table}' AND column_name = 'user_id') != 'bigint' THEN
                            ALTER TABLE {$table} ALTER COLUMN user_id TYPE bigint USING NULL;
                        END IF;
                    END $$;
                ");

                // Re-add foreign key
                DB::statement("ALTER TABLE {$table} ADD CONSTRAINT {$table}_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
            }
        } else {
            Schema::table('donations', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
            });
            Schema::table('hair_requests', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
            });
            // ... and so on for others if needed on other drivers
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way back to UUID from BigInt for arbitrary data
    }
};
