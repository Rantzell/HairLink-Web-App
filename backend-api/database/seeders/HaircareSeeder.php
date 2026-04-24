<?php

namespace Database\Seeders;

use App\Models\HaircareArticle;
use App\Models\HaircareVideo;
use Illuminate\Database\Seeder;

class HaircareSeeder extends Seeder
{
    public function run(): void
    {
        // Articles
        $articles = [
            [
                'title' => 'Complete Wig Care Guide: Washing and Conditioning',
                'category' => 'Care',
                'excerpt' => 'Learn the proper techniques for washing and conditioning your wig to maintain its beauty and longevity.',
                'content' => "Proper wig care starts with understanding your wig type. Whether you have a synthetic or human hair wig, washing and conditioning are essential for maintenance.\n\n**Washing Steps:**\n1. Fill a basin with lukewarm water (not hot)\n2. Add specialized wig shampoo to the water\n3. Gently submerge your wig and swish it through the water\n4. Avoid scrubbing or wringing the hair\n5. Rinse with clean water until all soap is gone\n6. Use a leave-in conditioner for extra softness\n\n**Drying:**\n- Gently squeeze out excess water with a soft towel\n- Never wring or twist your wig\n- Air dry on a wig stand or flat surface\n- Keep away from direct heat and sunlight\n\nRegular care extends your wig's lifespan by months or even years!",
                'read_time' => 5,
                'image' => '📚'
            ],
            [
                'title' => 'Styling Your Wig: Tips and Tricks',
                'category' => 'Styling',
                'excerpt' => 'Discover creative ways to style your wig and express your personal style with confidence.',
                'content' => "Styling a wig opens up endless possibilities for self-expression. Here are some professional tips to get the best results.\n\n**Basic Styling Tips:**\n- Use a wig brush or wide-tooth comb, never a regular hairbrush\n- Start from the ends and work your way up to avoid tangles\n- For synthetic wigs, use only cool water for styling\n- Human hair wigs can be styled like natural hair with proper products\n- Always style on a wig stand for best control\n\n**Advanced Techniques:**\n- Curling: Use low heat settings for human hair wigs only\n- Coloring: Consult professionals before coloring synthetic wigs\n- Layering: Ask your stylist about adding layers for more movement\n- Parting: You can change your part line with careful brushing\n\nRemember, confidence is the best accessory!",
                'read_time' => 4,
                'image' => '✨'
            ],
            [
                'title' => 'Storage Solutions for Long-Lasting Wigs',
                'category' => 'Storage',
                'excerpt' => 'Proper storage is key to keeping your wig in pristine condition when not in use.',
                'content' => "How you store your wig when not wearing it directly impacts its lifespan and appearance.\n\n**Best Storage Practices:**\n- Always use a wig stand or mannequin head\n- Store in a cool, dry place away from direct sunlight\n- Keep in a breathable bag or container\n- Avoid tight storage that can cause tangling\n- Store away from pets and humid environments\n\n**Storage Locations to Avoid:**\n- Bathrooms (humidity can damage your wig)\n- Near heating vents or radiators\n- Damp or cold storage areas\n- Places accessible to pets\n\n**Maintenance Between Wears:**\n- Lightly mist with wig spray between washes\n- Gently brush to remove any tangles\n- Air out your wig to prevent odors\n- Inspect regularly for any damage\n\nProper storage can extend your wig's life by 1-2 years!",
                'read_time' => 4,
                'image' => '🏠'
            ]
        ];

        foreach ($articles as $article) {
            HaircareArticle::updateOrCreate(
                ['title' => $article['title']],
                $article
            );
        }

        // Videos
        $videos = [
            [
                'title' => 'How to Wear a Wig for Beginners',
                'category' => 'Tutorial',
                'source' => 'youtube',
                'video_id' => '2RGeLiC0oeg',
                'author' => 'HairLink Channel',
                'duration' => '5:14',
                'views' => 1250,
                'description' => 'A complete guide on how to wear your wig properly for the first time.'
            ],
            [
                'title' => 'Wig Maintenance Tips & Tricks',
                'category' => 'Inspiration',
                'source' => 'youtube',
                'video_id' => '2EA-nTXU0Qc',
                'author' => 'Beauty Experts',
                'duration' => '8:22',
                'views' => 3540,
                'description' => 'Essential tips for maintaining your wig and making it last longer.'
            ],
            [
                'title' => 'Natural Looking Wig Styling',
                'category' => 'Care',
                'source' => 'youtube',
                'video_id' => '9sCvlAaiTQc',
                'author' => 'Professional Stylists',
                'duration' => '10:45',
                'views' => 2100,
                'description' => 'Learn how to style your wig to make it look as natural as possible.'
            ]
        ];

        foreach ($videos as $video) {
            HaircareVideo::updateOrCreate(
                ['video_id' => $video['video_id']],
                $video
            );
        }
    }
}
