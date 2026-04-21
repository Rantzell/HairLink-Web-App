<?php
try {
    $pdo = new PDO(
        'pgsql:host=db.vitvtysmorwrvyzjqbyr.supabase.co;port=5432;dbname=postgres',
        'postgres',
        'xnvit2LKSkZhvdH2'
    );
    echo "CONNECTED to Supabase!\n";
    $stmt = $pdo->query("SELECT current_database()");
    echo "Database: " . $stmt->fetchColumn() . "\n";
} catch (Exception $e) {
    echo "FAILED: " . $e->getMessage() . "\n";
    
    // Try with IPv6 directly
    echo "\nTrying IPv6 directly...\n";
    try {
        $pdo = new PDO(
            'pgsql:host=2406:da1a:6b0:f622:25e5:1385:bd7f:69b7;port=5432;dbname=postgres',
            'postgres',
            'xnvit2LKSkZhvdH2'
        );
        echo "CONNECTED via IPv6!\n";
    } catch (Exception $e2) {
        echo "IPv6 also FAILED: " . $e2->getMessage() . "\n";
    }
}
