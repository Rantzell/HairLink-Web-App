<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$res = DB::select("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'community_post_likes'");
print_r($res);
