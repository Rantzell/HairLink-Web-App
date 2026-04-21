<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = App\Models\User::where('email', 'admin@hairlink.local')->first();
if (!$user) {
    echo "User not found\n";
    exit;
}
$token = Illuminate\Support\Facades\Password::createToken($user);
echo "Token created: $token\n";

$status = Illuminate\Support\Facades\Password::reset([
    'email' => $user->email,
    'password' => 'newpassword123',
    'password_confirmation' => 'newpassword123',
    'token' => $token
], function($u, $pass) {
    echo "Callback executed!\n";
});

echo "Status: " . $status . "\n";
