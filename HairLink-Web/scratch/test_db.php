<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

try {
    $userCount = App\Models\User::count();
    echo "User Count: " . $userCount . "\n";
    
    $user = App\Models\User::first();
    if ($user) {
        echo "Example User: " . $user->email . "\n";
    } else {
        echo "No users found.\n";
    }

    $postCount = App\Models\CommunityPost::count();
    echo "Post Count: " . $postCount . "\n";
    
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "CATCHED ERROR: " . $e->getMessage() . "\n";
    echo "FILE: " . $e->getFile() . " LINE: " . $e->getLine() . "\n";
}
