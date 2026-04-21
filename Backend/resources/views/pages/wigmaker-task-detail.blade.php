@extends('layouts.dashboard')

@section('title', 'HairLink | Wigmaker Task Detail')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/wigmaker-module.css') }}">
@endpush

@section('content')
    @php
        $taskCode = $taskCode ?? 'WG-00000';
    @endphp

    <section class="section-wrap reveal wigmaker-page">
        <div class="section-title-block">
            <h1>Task {{ $task->task_code }}</h1>
            <p>Update production progress and notes for this assigned wig build.</p>
        </div>

        <article class="task-detail-shell">
            <div class="task-detail-grid mb-6">
                <div class="assignment-snapshot-pane bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm">
                    <div class="flex items-center gap-2 mb-4">
                        <i class='bx bxs-info-circle text-[#ad246d] text-2xl'></i>
                        <h2 class="text-xl font-bold m-0">Assignment Snapshot</h2>
                    </div>
                    
                    @php
                        $len = $task->target_length;
                        if (str_contains(strtolower($len), '10 to 14')) $len = 'Short';
                        if (str_contains(strtolower($len), '15 to 20')) $len = 'Medium';
                        if (str_contains(strtolower($len), 'more than 20')) $len = 'Long';
                    @endphp
                    <ul class="task-meta-list">
                        <li>
                            <strong>Hair Inventory Ref:</strong> 
                            <span class="text-[#ad246d] font-extrabold">{{ $task->donation ? $task->donation->reference : 'N/A' }}</span>
                        </li>
                        <li>
                            <strong>Wig Specification:</strong> 
                            <span>{{ ucfirst($len) }} / {{ ucfirst(str_replace('-', ' ', $task->target_color)) }}</span>
                        </li>
                        <li>
                            <strong>Assigned By:</strong> <span>Staff Operations</span>
                        </li>
                        <li>
                            <strong>Production Window:</strong> 
                            <span class="text-xs text-[#8c7895]">{{ $task->created_at->format('M d, Y') }} — {{ $task->due_date ? \Carbon\Carbon::parse($task->due_date)->format('M d, Y') : 'TBD' }}</span>
                        </li>
                    </ul>
                </div>

                <div class="material-snapshot-pane bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm">
                    <div class="flex items-center gap-2 mb-4">
                        <i class='bx bx-images text-[#ad246d] text-2xl'></i>
                        <h2 class="text-xl font-bold m-0">Original Hair Material</h2>
                    </div>

                    <div class="flex flex-wrap gap-3 bg-gray-50 p-3 rounded-xl border border-[#f2ebf4]">
                        @php $donation = $task->donation; @endphp
                        @if($donation)
                            @if($donation->photo_front_url)
                                <div class="file-preview-item group relative" style="width: 140px;">
                                    <a href="{{ $donation->photo_front_url }}" target="_blank" class="block rounded-xl border border-[#ead7e8] overflow-hidden bg-white hover:border-[#ad246d] transition-colors shadow-sm" style="width: 140px; height: 140px;">
                                        <img src="{{ $donation->photo_front_url }}" alt="Material Front" class="object-contain p-1" style="width: 100%; height: 100%; display: block;">
                                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i class='bx bx-search text-white text-3xl'></i>
                                        </div>
                                    </a>
                                </div>
                            @endif
                            @if($donation->photo_side_url)
                                <div class="file-preview-item group relative" style="width: 140px;">
                                    <a href="{{ $donation->photo_side_url }}" target="_blank" class="block rounded-xl border border-[#ead7e8] overflow-hidden bg-white hover:border-[#ad246d] transition-colors shadow-sm" style="width: 140px; height: 140px;">
                                        <img src="{{ $donation->photo_side_url }}" alt="Material Side" class="object-contain p-1" style="width: 100%; height: 100%; display: block;">
                                        <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <i class='bx bx-search text-white text-3xl'></i>
                                        </div>
                                    </a>
                                </div>
                            @endif
                            
                            @if(!$donation->photo_front_url && !$donation->photo_side_url)
                                <div class="col-span-2 p-8 text-center text-[#8c7895]">
                                    <i class='bx bx-hide text-3xl mb-2 opacity-50'></i>
                                    <p class="text-sm font-medium">No material photos available.</p>
                                </div>
                            @endif
                        @else
                            <div class="col-span-2 p-8 text-center text-[#8c7895] font-medium italic">
                                No donor record linked.
                            </div>
                        @endif
                    </div>
                </div>

                <div class="timeline-pane bg-white p-6 rounded-2xl border border-[#f2ebf4] shadow-sm">
                    <div class="flex items-center gap-2 mb-4">
                        <i class='bx bx-git-commit text-[#ad246d] text-2xl'></i>
                        <h2 class="text-xl font-bold m-0">Task Roadmap</h2>
                    </div>
                    <ol class="timeline-list space-y-4 bg-white p-4 pl-8 rounded-xl border border-[#f2ebf4]">
                        @php $stat = strtolower(trim($task->status)); @endphp
                        <li class="{{ in_array($stat, ['assigned', 'processing', 'completed']) ? 'done' : 'active' }} relative">
                            <div class="font-bold text-sm">Stage 1: Assigned</div>
                            <small class="text-[#8c7895]">Material delivery confirmed</small>
                        </li>
                        <li class="{{ $stat === 'processing' ? 'active' : ($stat === 'completed' ? 'done' : '') }} relative">
                            <div class="font-bold text-sm">Stage 2: In Progress</div>
                            <small class="text-[#8c7895]">Wig construction & styling</small>
                        </li>
                        <li class="{{ $stat === 'completed' ? 'active' : '' }} relative border-none">
                            <div class="font-bold text-sm">Stage 3: Completed</div>
                            <small class="text-[#8c7895]">Quality check & delivery</small>
                        </li>
                    </ol>
                </div>
            </div>

            <div class="conversion-note bg-gradient-to-r from-[#fdf7fb] to-white border-l-4 border-[#ad246d] p-4 flex items-center gap-4 rounded-r-xl mt-6 shadow-sm">
                <i class='bx bx-bulb text-[#ad246d] text-2xl animate-pulse'></i>
                <p class="text-sm m-0">When this task is marked <strong>Completed</strong>, the assigned hair inventory record is automatically flagged for conversion into an available wig entry for recipient matching.</p>
            </div>
        </article>

        <article class="task-update-shell">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
                <i class='bx bx-edit-alt' style="color: #ad246d; font-size: 1.5rem;"></i>
                <h2 style="margin: 0;">Update Production Status</h2>
            </div>
            
            <form id="taskUpdateForm" class="task-update-form" data-action-url="{{ route('wigmaker.task.update', $task->task_code) }}" novalidate>
                @if($task->status !== 'completed')
                    <div class="form-row">
                        <div class="form-group">
                            @php
                                $normalizedStatus = strtolower(trim($task->status));
                                
                                // Direct linear transition logic
                                if (in_array($normalizedStatus, ['assigned', 'in-queue', 'in queue'])) {
                                    $nextStatus = 'processing';
                                    $nextLabel = 'In Progress';
                                } elseif (in_array($normalizedStatus, ['processing', 'in-progress', 'in progress'])) {
                                    $nextStatus = 'completed';
                                    $nextLabel = 'Completed';
                                } else {
                                    $nextStatus = 'completed';
                                    $nextLabel = 'Completed';
                                }
                            @endphp
                            <label for="task-status-display">Transitioning To <span class="required">*</span></label>
                            <div style="position: relative;">
                                <i class='bx bx-right-arrow-alt' style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: #ad246d; font-size: 1.2rem;"></i>
                                <input type="text" id="task-status-display" value="{{ $nextLabel }}" readonly style="background:#fdf7fb; border: 1px solid #f1a8cf; color: #ad246d; font-weight: 800; padding-right: 40px;">
                            </div>
                            <input type="hidden" name="status" value="{{ $nextStatus }}">
                        </div>
                        <div class="form-group">
                            <label for="updated-at">Update Timestamp <span class="required">*</span></label>
                            <input id="updated-at" name="updatedAt" type="datetime-local" required value="{{ now()->format('Y-m-d\TH:i') }}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="progress-notes">Progress Message <span class="required">*</span></label>
                        <textarea id="progress-notes" name="progressNotes" rows="3" placeholder="Describe your current progress for staff review..." required></textarea>
                    </div>

                    <div class="form-group">
                        <label for="preview-photo">Attach Progress Photo (Optional)</label>
                        <div style="border: 2px dashed #ead7e8; border-radius: 12px; padding: 1.5rem; text-align: center; background: #fafafa; position: relative; transition: all 0.2s ease;">
                            <i class='bx bx-image-add' style="font-size: 2.2rem; color: #ad246d; margin-bottom: 0.5rem; display: block;"></i>
                            <span style="font-size: 0.85rem; color: #7f6b88;">Click to upload or drag and drop</span>
                            <input id="preview-photo" name="previewPhoto" type="file" accept=".jpg,.jpeg,.png,.webp" style="position: absolute; inset: 0; opacity: 0; cursor: pointer;">
                        </div>
                    </div>

                    <div class="form-actions" id="formActions" style="margin-top: 1rem;">
                        <button type="submit" class="soft-btn" style="padding: 0.8rem 2rem; font-weight: 800; background: linear-gradient(135deg, #ad246d 0%, #cf2f84 100%); color: #fff; border: none;">Save Production Update</button>
                        <a class="ghost-btn" href="{{ route('wigmaker.dashboard') }}">Cancel</a>
                    </div>
                @else
                    <div class="completion-banner" style="background: #f0fdf4; color: #166534; padding: 2rem; border-radius: 16px; border: 1px solid #bbf7d0; margin-bottom: 2rem; display: flex; align-items: center; gap: 1.5rem; box-shadow: 0 4px 12px rgba(22, 101, 52, 0.05);">
                        <div style="background: #dcfce7; padding: 0.8rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <i class='bx bxs-check-circle' style="font-size: 2.5rem; color: #16a34a;"></i>
                        </div>
                        <div>
                            <strong style="font-size: 1.25rem; display: block; margin-bottom: 0.25rem;">Production Completed</strong>
                            <p style="margin: 0; font-size: 1rem; color: #166534; opacity: 0.9;">This task has been finalized and synced with the inventory system. No further updates are required of you.</p>
                        </div>
                    </div>

                    <div class="form-actions" style="margin-top: 2rem;">
                        <a class="soft-btn" href="{{ route('wigmaker.dashboard') }}" style="min-width: 200px; text-align: center;">Back to Workspace Dashboard</a>
                    </div>
                @endif
            </form>

            <p class="update-banner" data-update-banner hidden></p>
        </article>

        <article class="task-history-shell">
            <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.4rem;">
                <i class='bx bx-history' style="color: #ad246d; font-size: 1.5rem;"></i>
                <h2 style="margin: 0;">Production Update History</h2>
            </div>
            <p class="task-history-sub">Detailed log of your stage updates for staff oversight.</p>

            <div class="table-wrap" style="margin-top: 1rem;">
                <table class="task-table" aria-label="Production update history">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th style="width: 70px; text-align: center;">Photo</th>
                            <th>Stage</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($histories as $history)
                        <tr>
                            <td style="vertical-align: middle;">{{ $history->created_at->format('Y-m-d h:i A') }}</td>
                            <td style="text-align: center; vertical-align: middle;">
                                @if($history->preview_photo_url)
                                    <a href="{{ $history->preview_photo_url }}" target="_blank" class="file-thumbnail">
                                        <img src="{{ $history->preview_photo_url }}" alt="Preview" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                                        <div class="preview-overlay"><i class='bx bx-search'></i></div>
                                    </a>
                                @else
                                    <span style="color: #ccc;">---</span>
                                @endif
                            </td>
                            <td class="align-middle">
                                <x-dashboard.status-pill :status="$history->status" />
                            </td>
                            <td class="align-middle text-sm text-[#5d4d62]">{{ $history->notes ?? '—' }}</td>
                        </tr>
                        @empty
                        <tr>
                            <td colspan="4" style="text-align:center;color:#7a687f;padding: 3rem;">No production history recorded yet.</td>
                        </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </article>
    </section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/wigmaker-module.js') }}" defer></script>
@endpush
