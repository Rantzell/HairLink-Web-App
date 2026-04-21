<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (config('database.default') === 'pgsql') {
            // 1. Fix the notifications table user_id type if it exists
            DB::statement("
                DO $$
                DECLARE
                    pol RECORD;
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
                        -- Drop policies first if they exist
                        FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'notifications' LOOP
                            EXECUTE format('DROP POLICY %I ON notifications', pol.policyname);
                        END LOOP;

                        -- Drop existing foreign key if any
                        ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
                        
                        -- Drop NOT NULL constraint if it exists
                        ALTER TABLE notifications ALTER COLUMN user_id DROP NOT NULL;

                        -- Change user_id from UUID to BigInt
                        -- We use USING NULL because existing data is likely incompatible 
                        -- or refers to old Supabase Auth UUIDs that we are no longer using.
                        ALTER TABLE notifications ALTER COLUMN user_id TYPE bigint USING NULL;
                    END IF;
                END
                $$;
            ");

            // 2. Fix the trigger function handle_hair_request_created
            // We re-define it to ensure logic is safe for the new schema
            DB::statement("
                CREATE OR REPLACE FUNCTION handle_hair_request_created()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
                        INSERT INTO public.notifications (user_id, title, message, type)
                        VALUES (
                            NEW.user_id, 
                            'Hair Request Submitted 💇🏻‍♀️', 
                            'Your hair request has been received and is pending review.', 
                            'general'
                        );
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            ");
            
            // 3. Just in case, check for donation triggers too if they exist
            DB::statement("
                CREATE OR REPLACE FUNCTION handle_donation_created()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
                        INSERT INTO public.notifications (user_id, title, message, type)
                        VALUES (
                            NEW.user_id, 
                            'Donation Submitted 💖', 
                            'Your hair donation record has been created successfully.', 
                            'general'
                        );
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No easy way to revert trigger function definitions to unknown previous states
    }
};
