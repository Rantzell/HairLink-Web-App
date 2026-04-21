<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Create a mock user
$user = App\Models\User::first();

if (!$user) {
    echo "No user found in DB.\n";
    exit;
}

echo "Testing Community Index as user: {$user->email}\n";

// Act as user
Auth::login($user);

try {
    $controller = new App\Http\Controllers\Api\CommunityController();
    $response = $controller->index();
    echo "Response Code: " . $response->getStatusCode() . "\n";
    echo "Data Count: " . count($response->getData()) . "\n";
    echo "SUCCESS\n";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
