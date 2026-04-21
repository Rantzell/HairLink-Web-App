@extends('layouts.dashboard')

@section('title', 'HairLink | Staff Verification Detail')

@push('styles')
    <link rel="stylesheet" href="{{ asset('assets/css/staff-module.css') }}">
@endpush

@section('content')
@php
    $type = $type ?? 'donor';
    $reference = $reference ?? 'N/A';
    $isDonor = $type === 'donor';
@endphp

<section class="section-wrap reveal staff-page">
    <div class="section-title-block">
        <h1>{{ $isDonor ? 'Donor Hair Verification' : 'Recipient Request Verification' }}</h1>
        <p>Reference: <strong>{{ $reference }}</strong></p>
    </div>

    <article class="staff-block verification-detail-shell">
        <div class="verification-grid">
            <section>
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.25rem;">
                    <i class='bx bx-notepad' style="color: #ad246d; font-size: 1.5rem;"></i>
                    <h2 style="margin: 0;">Submission Summary</h2>
                </div>
                
                @if($isDonor)
                    <div class="summary-card" style="background: #fdf7fb; border: 1px solid #f2ebf4; border-radius: 12px; padding: 1rem;">
                        <ul class="verification-list" style="list-style: none; display: grid; gap: 0.5rem; padding: 0;">
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-user' style="color: #ad246d;"></i>
                                <span><strong>Donor:</strong> {{ $record->user->first_name ?? 'Unknown' }} {{ $record->user->last_name ?? '' }}</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-cut' style="color: #ad246d;"></i>
                                <span><strong>Hair Length:</strong> {{ ucfirst($record->hair_length) }}</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-palette' style="color: #ad246d;"></i>
                                <span><strong>Hair Color:</strong> {{ ucfirst($record->hair_color) }}</span>
                            </li>
                            <li style="display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-message-square-detail' style="color: #ad246d; margin-top: 2px;"></i>
                                <span><strong>Reason:</strong> <span style="font-style: italic; color: #614f68;">"{{ $record->reason ?? 'No reason provided' }}"</span></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; border-top: 1px solid #f2ebf4; padding-top: 0.5rem; margin-top: 0.2rem; color: #8c7895;">
                                <i class='bx bx-calendar-check'></i>
                                <span><strong>Submitted:</strong> {{ $record->created_at->format('M d, Y h:i A') }}</span>
                            </li>
                        </ul>
                    </div>
                @else
                    <div class="summary-card" style="background: #fdf7fb; border: 1px solid #f2ebf4; border-radius: 12px; padding: 1rem;">
                        <ul class="verification-list" style="list-style: none; display: grid; gap: 0.5rem; padding: 0;">
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-user-voice' style="color: #ad246d;"></i>
                                <span><strong>Recipient:</strong> {{ $record->user->first_name ?? 'Unknown' }} {{ $record->user->last_name ?? '' }}</span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-ruler' style="color: #ad246d;"></i>
                                <span><strong>Preferred Wig Size:</strong> <strong>{{ ucfirst($record->wig_length ?? 'N/A') }}</strong></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-paint' style="color: #ad246d;"></i>
                                <span><strong>Preferred Color:</strong> <strong>{{ ucfirst($record->wig_color ?? 'N/A') }}</strong></span>
                            </li>
                            <li style="display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.9rem;">
                                <i class='bx bx-book-content' style="color: #ad246d; margin-top: 2px;"></i>
                                <span><strong>Applicant's Story:</strong> <span style="font-style: italic; color: #614f68;">"{{ $record->story ?? 'No story provided' }}"</span></span>
                            </li>
                            <li style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; border-top: 1px solid #f2ebf4; padding-top: 0.5rem; margin-top: 0.2rem; color: #8c7895;">
                                <i class='bx bx-time-five'></i>
                                <span><strong>Submitted:</strong> {{ $record->created_at->format('M d, Y h:i A') }}</span>
                            </li>
                        </ul>
                    </div>
                @endif
            </section>

            <section>
                <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.8rem;">
                    <i class='bx bx-paperclip' style="color: #ad246d; font-size: 1.5rem;"></i>
                    <h2 style="margin: 0; font-size: 1.25rem;">Attached Files & Documents</h2>
                </div>
                
                <div class="file-preview-grid">
                    @if($isDonor)
                        @if($record->photo_front_url)
                            <div class="file-preview-item">
                                <a href="{{ $record->photo_front_url }}" target="_blank" class="file-thumbnail" style="width: 80px; height: 80px;">
                                    <img src="{{ $record->photo_front_url }}" alt="Reference Photo" style="width: 100%; height: 100%; object-fit: cover;">
                                    <div class="preview-overlay"><i class='bx bx-search-alt' style="font-size: 1.5rem;"></i></div>
                                </a>
                                <span class="file-label-small">Reference Photo</span>
                            </div>
                        @endif
                        @if($record->photo_side_url)
                            <div class="file-preview-item">
                                <a href="{{ $record->photo_side_url }}" target="_blank" class="file-thumbnail" style="width: 80px; height: 80px;">
                                    <img src="{{ $record->photo_side_url }}" alt="Hair Side" style="width: 100%; height: 100%; object-fit: cover;">
                                    <div class="preview-overlay"><i class='bx bx-search-alt' style="font-size: 1.5rem;"></i></div>
                                </a>
                                <span class="file-label-small">Hair Side</span>
                            </div>
                        @endif
                    @else
                        @php
                            $docs = is_array($record->documents) ? $record->documents : (is_string($record->documents) ? json_decode($record->documents, true) : []);
                            $photo = $record->additional_photo;
                        @endphp

                        @if($record->additional_photo_url)
                            <div class="file-preview-item">
                                <a href="{{ $record->additional_photo_url }}" target="_blank" class="file-thumbnail" style="width: 80px; height: 80px;">
                                    <img src="{{ $record->additional_photo_url }}" alt="Reference Photo" style="width: 100%; height: 100%; object-fit: cover;">
                                    <div class="preview-overlay"><i class='bx bx-search-alt' style="font-size: 1.5rem;"></i></div>
                                </a>
                                <span class="file-label-small">Reference Photo</span>
                            </div>
                        @endif

                        @if(count($record->documents_urls) > 0)
                            @foreach($record->documents_urls as $index => $url)
                                <div class="file-preview-item">
                                    @php $isImg = in_array(strtolower(pathinfo(explode('?', $url)[0], PATHINFO_EXTENSION)), ['jpg','jpeg','png','webp','gif','svg']); @endphp
                                    <a href="{{ $url }}" target="_blank" class="file-thumbnail">
                                        @if($isImg)
                                            <img src="{{ $url }}" alt="Document {{ $index + 1 }}">
                                        @else
                                            <div style="background: #fdf7fb; width: 100%; height: 100%; display: grid; place-items: center;">
                                                <i class='bx bxs-file-blank' style="font-size: 2.5rem; color: #ad246d;"></i>
                                            </div>
                                        @endif
                                        <div class="preview-overlay"><i class='bx bx-link-external' style="font-size: 1.5rem;"></i></div>
                                    </a>
                                    <span class="file-label-small">Doc #{{ $index + 1 }}</span>
                                </div>
                            @endforeach
                        @endif
                    @endif
                </div>

                @php
                    $hasAttachments = $isDonor 
                        ? ($record->photo_front_url || $record->photo_side_url)
                        : ($record->additional_photo_url || count($record->documents_urls) > 0);
                @endphp

                @if(!$hasAttachments)
                    <div style="padding: 2rem; border: 2px dashed #f2ebf4; border-radius: 12px; text-align: center; color: #8c7895;">
                        <i class='bx bx-file-find' style="font-size: 2rem; display: block; margin-bottom: 0.5rem;"></i>
                        <p style="margin: 0; font-size: 0.9rem;">No documents or photos attached to this submission.</p>
                    </div>
                @endif
            </section>
        </div>
    </article>

    <article class="staff-block" style="margin-top: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem;">
            <i class='bx bx-check-shield' style="color: #ad246d; font-size: 1.5rem;"></i>
            <h2 style="margin: 0;">Verification Decision</h2>
        </div>
        
        <form class="verification-form" data-verification-form data-action-url="{{ route('staff.verification.status', ['type' => $type, 'reference' => $reference]) }}" novalidate>
            <div class="form-group">
                <label for="decisionRemarks" style="font-weight: 700; color: #4d3f56;">Validation Remarks <span class="required" style="color: #ad246d;">*</span></label>
                <textarea id="decisionRemarks" rows="3" placeholder="Explain the rationale for this decision (e.g., identity confirmed, document validity)..." required style="border-radius: 12px; border-color: #f2ebf4;"></textarea>
            </div>

            <div class="form-actions" style="margin-top: 1rem; display: flex; gap: 0.8rem;">
                <button type="button" class="soft-btn" data-decision-btn data-decision="approved" style="background: linear-gradient(135deg, #ad246d 0%, #cf2f84 100%); color: #fff; border: none; padding: 0.8rem 2.5rem; font-weight: 800;">Approve Request</button>
                <button type="button" class="ghost-btn" data-decision-btn data-decision="rejected" style="border: 2px solid #f2ebf4; padding: 0.8rem 2.5rem; font-weight: 800;">Reject Request</button>
                <a class="ghost-btn" href="{{ $isDonor ? route('staff.donor-verification') : route('staff.recipient-verification') }}" style="margin-left: auto; color: #8c7895;">Return to Queue</a>
            </div>
        </form>

        <p class="decision-banner" data-decision-banner hidden></p>
    </article>
</section>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/staff-module.js') }}" defer></script>
@endpush
