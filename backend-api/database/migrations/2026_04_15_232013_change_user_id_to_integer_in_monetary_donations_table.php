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
            // Drop ALL policies on the table because they might depend on user_id
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
            
            // Drop foreign key first if it exists
            DB::statement('ALTER TABLE monetary_donations DROP CONSTRAINT IF EXISTS monetary_donations_user_id_foreign');
            
            // Change type
            DB::statement('ALTER TABLE monetary_donations ALTER COLUMN user_id TYPE bigint USING NULL');
            
            // Re-add foreign key
            DB::statement('ALTER TABLE monetary_donations ADD CONSTRAINT monetary_donations_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
        } else {
            Schema::table('monetary_donations', function (Blueprint $table) {
                $table->unsignedBigInteger('user_id')->nullable()->change();
            });
        }
    }

    public function down(): void
    {
        // No easy way back to uuid if we don't know why it was there, 
        // but let's just make it bigInteger to be safe as per the original intended migration.
        Schema::table('monetary_donations', function (Blueprint $table) {
            $table->bigInteger('user_id')->nullable()->change();
        });
    }
};
