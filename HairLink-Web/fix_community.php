<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$tables = ['community_posts', 'community_comments', 'community_post_likes'];

foreach ($tables as $table) {
    try {
        echo "Processing $table...\n";
        
        // 1. Drop constraints
        DB::statement("ALTER TABLE $table DROP CONSTRAINT IF EXISTS {$table}_user_id_foreign");
        DB::statement("ALTER TABLE $table DROP CONSTRAINT IF EXISTS {$table}_user_id_fkey");

        // 2. Drop NOT NULL constraint
        DB::statement("ALTER TABLE $table ALTER COLUMN user_id DROP NOT NULL");

        // 3. Alter column type
        DB::statement("ALTER TABLE $table ALTER COLUMN user_id TYPE bigint USING NULL");
        echo "Altered user_id to bigint for $table.\n";

        // 4. Add constraint
        DB::statement("ALTER TABLE $table ADD CONSTRAINT {$table}_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL");
        echo "Added foreign key for $table.\n";
    } catch (\Exception $e) {
        echo "Error on $table: " . $e->getMessage() . "\n";
    }
}
echo "Done.\n";
