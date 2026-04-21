<?php
$connStrings = [
    [
        "host" => "aws-0-us-east-1.pooler.supabase.com",
        "port" => 6543,
        "user" => "postgres.vitvtysmorwrvyzjqbyr",
        "pass" => "xnvit2LKSkZhvdH2"
    ],
    [
        "host" => "aws-0-us-east-1.pooler.supabase.com",
        "port" => 5432,
        "user" => "postgres.vitvtysmorwrvyzjqbyr",
        "pass" => "xnvit2LKSkZhvdH2"
    ]
];

foreach ($connStrings as $c) {
    echo "Trying {$c['host']}:{$c['port']}...\n";
    try {
        $pdo = new PDO(
            "pgsql:host={$c['host']};port={$c['port']};dbname=postgres",
            $c['user'],
            $c['pass'],
            [PDO::ATTR_TIMEOUT => 3]
        );
        echo "CONNECTED successfully!\n";
        exit(0);
    } catch (Exception $e) {
        echo "FAILED: " . $e->getMessage() . "\n";
    }
}
