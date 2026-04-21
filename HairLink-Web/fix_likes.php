<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

try {
    echo "Fixing community_post_likes.community_post_id type mismatch...\n";
    
    // 1. Drop constraints
    DB::statement("ALTER TABLE community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_community_post_id_foreign");
    DB::statement("ALTER TABLE community_post_likes DROP CONSTRAINT IF EXISTS community_post_likes_community_post_id_fkey");

    // 2. Drop NOT NULL constraint
    DB::statement("ALTER TABLE community_post_likes ALTER COLUMN community_post_id DROP NOT NULL");

    // 3. Alter column type to UUID
    DB::statement("ALTER TABLE community_post_likes ALTER COLUMN community_post_id TYPE uuid USING NULL");
    echo "Altered community_post_id to uuid for community_post_likes.\n";

    // 4. Re-add foreign key constraint
    DB::statement("ALTER TABLE community_post_likes ADD CONSTRAINT community_post_likes_community_post_id_foreign FOREIGN KEY (community_post_id) REFERENCES community_posts(id) ON DELETE CASCADE");
    echo "Added foreign key constraint for community_post_id.\n";

    echo "Done.\n";
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
