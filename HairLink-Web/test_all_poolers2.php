<?php
$regions = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-south-1', 'sa-east-1', 'ca-central-1'];
foreach ($regions as $reg) {
    for ($i = 0; $i <= 3; $i++) {
        $host = "aws-$i-$reg.pooler.supabase.com";
        try {
            $pdo = new PDO("pgsql:host=$host;port=5432;dbname=postgres", "postgres", "xnvit2LKSkZhvdH2", [PDO::ATTR_TIMEOUT => 2]);
            file_put_contents('found_pooler.txt', $host);
            echo "FOUND: $host\n";
            exit(0);
        } catch (Exception $e) {
        }
    }
}
echo "Not found.\n";
