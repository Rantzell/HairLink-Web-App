<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MilestoneController extends Controller
{
    /**
     * Get donation stats and progress for the mobile milestone screen.
     */
    public function summary()
    {
        $user = Auth::user();
        
        $totalDonations = $user->donations()->count();
        $completedDonations = $user->donations()->where('status', 'Completed')->count();
        
        // Example simple logic for levels/badges
        $level = 1;
        if ($totalDonations >= 10) $level = 3;
        elseif ($totalDonations >= 5) $level = 2;
        
        $nextMilestone = 5;
        if ($totalDonations >= 5) $nextMilestone = 10;
        if ($totalDonations >= 10) $nextMilestone = 25;

        return response()->json([
            'total_donations' => $totalDonations,
            'completed_donations' => $completedDonations,
            'current_level' => $level,
            'next_milestone' => $nextMilestone,
            'progress_percent' => min(100, round(($totalDonations / $nextMilestone) * 100)),
            'badges' => $this->getBadges($totalDonations)
        ]);
    }

    private function getBadges($count)
    {
        $badges = [
            ['id' => 'first_timer', 'name' => 'First Step', 'achieved' => $count >= 1],
            ['id' => 'consistent', 'name' => 'Consistent Hero', 'achieved' => $count >= 5],
            ['id' => 'life_changer', 'name' => 'Life Changer', 'achieved' => $count >= 10],
        ];

        return $badges;
    }
}
