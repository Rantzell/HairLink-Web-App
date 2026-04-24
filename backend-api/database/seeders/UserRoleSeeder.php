<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Staff User
        User::updateOrCreate(
            ['email' => 'staff@hairlink.ph'],
            [
                'name' => 'HairLink Staff',
                'first_name' => 'HairLink',
                'last_name' => 'Staff',
                'role' => 'staff',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Wigmaker User
        User::updateOrCreate(
            ['email' => 'wigmaker@hairlink.ph'],
            [
                'name' => 'Professional Wigmaker',
                'first_name' => 'Professional',
                'last_name' => 'Wigmaker',
                'role' => 'wigmaker',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );

        // Admin User
        User::updateOrCreate(
            ['email' => 'admin@hairlink.ph'],
            [
                'name' => 'System Admin',
                'first_name' => 'System',
                'last_name' => 'Admin',
                'role' => 'admin',
                'password' => Hash::make('password123'),
                'email_verified_at' => now(),
            ]
        );
    }
}
