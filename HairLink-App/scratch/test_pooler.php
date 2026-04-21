<?php
$host = 'aws-0-ap-southeast-1.pooler.supabase.com';
$port = '6543';
$dbname = 'postgres';
$user = 'postgres.vitvtysmorwrvyzjqbyr';
$password = 'xnvit2LKSkZhvdH2';

$dsn = "pgsql:host=$host;port=$port;dbname=$dbname";

try {
    $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "Connected successfully to pooler in ap-southeast-1!\n";
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
