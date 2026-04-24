<?php
$regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
    'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1',
    'sa-east-1', 'ca-central-1'
];
foreach ($regions as $reg) {
    $host = "aws-0-{$reg}.pooler.supabase.com";
    $port = 6543;
    $user = "postgres.vitvtysmorwrvyzjqbyr";
    $pass = "xnvit2LKSkZhvdH2";
    
    try {
        $pdo = new PDO(
            "pgsql:host={$host};port={$port};dbname=postgres",
            $user,
            $pass,
            [PDO::ATTR_TIMEOUT => 2]
        );
        echo "FOUND! CONNECTED TO: {$host}\n";
        exit(0);
    } catch (Exception $e) {
        // ignore
    }
}
echo "Tried all regions, no success.\n";
