<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CommunityPost;
use App\Models\Donation;
use App\Models\HairRequest;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // Demo Admin
        User::updateOrCreate(
            ['email' => 'admin@hairlink.local'],
            [
                'name' => 'Admin User',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => Hash::make('admin12345'),
                'role' => 'admin',
                'email_verified_at' => now(),
            ]
        );

        // Staff demo
        User::updateOrCreate(
            ['email' => 'staff.demo@hairlink.local'],
            [
                'name' => 'Staff Demo',
                'first_name' => 'Staff',
                'last_name' => 'Demo',
                'password' => Hash::make('password123'),
                'role' => 'staff',
                'email_verified_at' => now(),
            ]
        );

        // Wigmaker demo
        User::updateOrCreate(
            ['email' => 'wigmaker.demo@hairlink.local'],
            [
                'name' => 'Wigmaker Demo',
                'first_name' => 'Wigmaker',
                'last_name' => 'Demo',
                'password' => Hash::make('password123'),
                'role' => 'wigmaker',
                'email_verified_at' => now(),
            ]
        );

        // Demo Donor
        $donor = User::updateOrCreate(
            ['email' => 'donor.demo@hairlink.local'],
            [
                'name' => 'Donor Demo',
                'first_name' => 'Donor',
                'last_name' => 'Demo',
                'password' => Hash::make('password123'),
                'role' => 'donor',
                'email_verified_at' => now(),
            ]
        );

        // Demo Recipient
        $recipient = User::updateOrCreate(
            ['email' => 'recipient.demo@hairlink.local'],
            [
                'name' => 'Recipient Demo',
                'first_name' => 'Recipient',
                'last_name' => 'Demo',
                'password' => Hash::make('password123'),
                'role' => 'recipient',
                'email_verified_at' => now(),
            ]
        );

        // For associated sample data, use the donor demo account
        $user = $donor;

        // Sample Donations
        $donations = [
            [
                'reference' => 'HD-240001001',
                'hair_length' => '15 to 20 inches',
                'hair_color' => 'Black',
                'treated_hair' => false,
                'status' => 'Completed',
                'certificate_no' => 'CERT-2026-0001',
                'created_at' => now()->subDays(10),
            ],
            [
                'reference' => 'HD-240001002',
                'hair_length' => '10 to 14 inches',
                'hair_color' => 'Brown',
                'treated_hair' => true,
                'status' => 'Received',
                'created_at' => now()->subDays(2),
            ]
        ];

        foreach ($donations as $donationData) {
            $existing = $user->donations()->where('reference', $donationData['reference'])->first();
            if ($existing) continue;

            $donation = $user->donations()->create($donationData);

            // Add status history
            if ($donation->status === 'Completed') {
                $statusFlow = ['Submitted', 'Received', 'Validated', 'Processing', 'Completed'];
                foreach ($statusFlow as $index => $status) {
                    $donation->statusHistories()->create([
                        'status' => $status,
                        'created_at' => now()->subDays(10 - $index)
                    ]);
                }
            } else {
                $donation->statusHistories()->create(['status' => 'Submitted', 'created_at' => now()->subDays(2)]);
                $donation->statusHistories()->create(['status' => 'Received', 'created_at' => now()->subDays(1)]);
            }
        }

        // Sample Requests
        $requests = [
            [
                'reference' => 'REQ-ABC12-234567',
                'contact_number' => '0917-234-5678',
                'gender' => 'female',
                'story' => 'I started experiencing hair loss 2 years ago due to alopecia. This has affected my confidence significantly...',
                'status' => 'Matched',
                'created_at' => now()->subDays(30),
            ],
            [
                'reference' => 'REQ-XYZ78-891234',
                'contact_number' => '0916-123-4567',
                'gender' => 'male',
                'story' => 'Hair loss started after medical treatment. Looking forward to regaining my confidence...',
                'status' => 'Under Review',
                'created_at' => now()->subDays(5),
            ]
        ];

        foreach ($requests as $requestData) {
            $existing = $user->hairRequests()->where('reference', $requestData['reference'])->first();
            if ($existing) continue;

            $hairRequest = $user->hairRequests()->create($requestData);

            // Add status history
            if ($hairRequest->status === 'Matched') {
                $statusFlow = ['Submitted', 'Under Review', 'Matched'];
                foreach ($statusFlow as $index => $status) {
                    $hairRequest->statusHistories()->create([
                        'status' => $status,
                        'created_at' => now()->subDays(30 - ($index * 5))
                    ]);
                }
            } else {
                $hairRequest->statusHistories()->create(['status' => 'Submitted', 'created_at' => now()->subDays(5)]);
                $hairRequest->statusHistories()->create(['status' => 'Under Review', 'created_at' => now()->subDays(3)]);
            }
        }

        // Sample Community Posts
        $posts = [
            [
                'content' => "Just received my wig today and I'm feeling so confident! Thank you to all the donors who made this possible.",
                'likes' => 12,
                'created_at' => now()->subDays(2),
            ],
            [
                'content' => "I donated my hair yesterday! It was a wonderful experience knowing it will help someone regain their confidence.",
                'likes' => 8,
                'created_at' => now()->subDays(3),
            ]
        ];

        // Only seed community posts if the user has none yet
        if ($user->communityPosts()->count() === 0) {
            foreach ($posts as $postData) {
                $post = $user->communityPosts()->create($postData);

                // Add a comment to the first post
                if ($postData['likes'] === 12) {
                    $post->comments()->create([
                        'user_id' => $user->id,
                        'content' => 'This is so inspiring! Wishing you all the best on your journey.',
                        'created_at' => now()->subDays(1)
                    ]);
                }
            }
        }
    }
}
