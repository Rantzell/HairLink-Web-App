<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\CommunityPost;
use App\Http\Controllers\Api\CommunityController;

try {
    $userCount = User::count();
    echo "User Count: " . $userCount . "\n";
    
    $user = User::first();
    if ($user) {
        echo "Example User ID: " . $user->id . "\n";
        Auth::login($user);
    } else {
        echo "No users found.\n";
    }

    $postCount = CommunityPost::count();
    echo "Post Count: " . $postCount . "\n";
    
    $controller = new CommunityController();
    $response = $controller->index();
    echo "Response Code: " . $response->getStatusCode() . "\n";
    
    $posts = $response->getData();
    echo "Loaded " . count($posts) . " posts.\n";
    if (count($posts) > 0) {
        $firstPost = $posts[0];
        echo "First post content: " . $firstPost->content . "\n";
        echo "Author: " . ($firstPost->user->name ?? 'NULL') . "\n";
    }
    
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "CATCHED ERROR: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . " LINE: " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
