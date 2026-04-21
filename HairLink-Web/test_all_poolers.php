<?php
$regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-south-1'];
foreach ($regions as $reg) {
    $host = "aws-0-{$reg}.pooler.supabase.com";
    $port = 6543;
    $user = "postgres.vitvtysmorwrvyzjqbyr";
    $pass = "xnvit2LKSkZhvdH2";
    
    // echo "Trying {$host}...\n";
    try {
        $pdo = new PDO(
            "pgsql:host={$host};port={$port};dbname=postgres",
            $user,
            $pass,
            [PDO::ATTR_TIMEOUT => 2]
        );
        echo "CONNECTED to {$host} successfully!\n";
        exit(0);
    } catch (Exception $e) {
        $msg = $e->getMessage();
        if (strpos($msg, "Tenant or user not found") === false) {
             echo "{$host}: " . $msg . "\n";
        }
    }
}
echo "Tried all.\n";
