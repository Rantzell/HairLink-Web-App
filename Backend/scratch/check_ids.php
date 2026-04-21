<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$posts = DB::table('community_posts')->get();
echo "Total Posts: " . count($posts) . "\n";
foreach ($posts as $post) {
    echo "ID: {$post->id}, User ID: " . ($post->user_id ?? 'NULL') . ", Content: " . substr($post->content, 0, 20) . "...\n";
}

$counts = DB::table('community_posts')
    ->select('user_id', DB::raw('count(*) as total'))
    ->groupBy('user_id')
    ->get();
print_r($counts);
