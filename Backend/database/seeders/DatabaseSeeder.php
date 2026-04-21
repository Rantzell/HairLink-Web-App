<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Articles and Videos
        $this->call(HaircareSeeder::class);

        // Create Test User and associated data
        $this->call(SampleDataSeeder::class);
    }
}
