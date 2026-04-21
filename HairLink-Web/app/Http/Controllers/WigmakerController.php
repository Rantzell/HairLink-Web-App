<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\WigProduction;
use App\Notifications\DonationCompletedNotification;
use Illuminate\Support\Facades\Auth;

class WigmakerController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return redirect('/login');
        }

        $tasks = WigProduction::with('donation')->where('wigmaker_id', $user->id)->get();
        return view('pages.wigmaker-dashboard', compact('tasks'));
    }

    public function productionTasks(Request $request)
    {
        $user = $request->user();
        $tasks = WigProduction::with('donation')
            ->where('wigmaker_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->get();
        
        $queuedCount = $tasks->where('status', 'assigned')->count();
        $inProgressCount = $tasks->where('status', 'processing')->count();
        $completedCount = $tasks->where('status', 'completed')->count();
            
        return view('pages.wigmaker-production-tasks', compact('tasks', 'queuedCount', 'inProgressCount', 'completedCount'));
    }

    public function taskDetail($taskCode)
    {
        $task = WigProduction::with(['donation', 'statusHistories'])
            ->where('task_code', $taskCode)
            ->firstOrFail();

        $histories = $task->statusHistories()->orderBy('created_at', 'desc')->get();

        return view('pages.wigmaker-task-detail', compact('task', 'histories'));
    }

    public function updateTask(Request $request, $taskCode)
    {
        $user = Auth::user();
        $task = WigProduction::where('task_code', $taskCode)->where('wigmaker_id', $user->id)->firstOrFail();
        
        $validated = $request->validate([
            'status' => 'required|string|in:assigned,processing,completed',
            'progressNotes' => 'required|string',
            'updatedAt' => 'nullable|date',
            'previewPhoto' => 'nullable|image|max:10240',
        ]);

        // 1. Update Task status
        $task->update([
            'status' => $validated['status'],
        ]);

        // 2. Handle metadata (photo)
        $metadata = [];
        if ($request->hasFile('previewPhoto')) {
            $path = $request->file('previewPhoto')->store('production/previews', 's3');
            $metadata['preview_photo'] = $path;
        }

        // 3. Create Status History with custom timestamp if provided
        $history = $task->statusHistories()->create([
            'status' => $validated['status'],
            'notes' => $validated['progressNotes'],
            'metadata' => !empty($metadata) ? $metadata : null,
        ]);

        if ($validated['updatedAt']) {
            $history->update(['created_at' => $validated['updatedAt']]);
        }

        // 4. Sync linked donation status so staff tracking auto-updates
        if ($task->donation_id) {
            $donation = \App\Models\Donation::find($task->donation_id);
            if ($donation) {
                $statusMap = [
                    'assigned' => 'In Queue',
                    'processing' => 'In Progress',
                    'completed' => 'Completed',
                ];

                if (isset($statusMap[$validated['status']])) {
                    $newDonationStatus = $statusMap[$validated['status']];
                    if ($donation->status !== $newDonationStatus) {
                        $donation->update(['status' => $newDonationStatus]);
                        $donation->statusHistories()->create([
                            'status' => $newDonationStatus,
                            'notes' => $validated['progressNotes'],
                        ]);

                        // NEW: Trigger Donor Notification on Completion
                        if ($newDonationStatus === 'Completed') {
                            $donation->user->notify(new DonationCompletedNotification($donation));
                        }
                    }
                }
            }
        }

        return response()->json([
            'message' => 'Task updated successfully and synced with tracking.',
            'success' => true,
            'history' => [
                'at' => $history->created_at ? $history->created_at->format('Y-m-d h:i A') : now()->format('Y-m-d h:i A'),
                'status' => str_replace('-', ' ', ucfirst($history->status)),
                'notes' => $history->notes,
                'metadata' => $history->metadata,
                'preview_photo_url' => $history->preview_photo_url
            ]
        ]);
    }
}
