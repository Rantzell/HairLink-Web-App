@extends('layouts.dashboard')

@section('title', 'Request Details')

@section('content')
<div class="section-wrap tracking-detail-page" id="trackingDetailContent">
    <div class="module-head">
        <h1>Request Details</h1>
        <p id="request-reference-display">Reference #{{ $requestData->reference }}</p>
    </div>

    <!-- Refined Summary Grid -->
    <div class="summary-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.8rem; margin-bottom: 1rem;">
        <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
            <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                <i class='bx bx-hash' style="color: #ad246d; font-size: 1.2rem;"></i>
            </div>
            <div>
                <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Reference</small>
                <strong style="color: #3b2e43; font-size: 0.85rem;">{{ $requestData->reference }}</strong>
            </div>
        </div>
        <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
            <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                <i class='bx bx-info-circle' style="color: #ad246d; font-size: 1.2rem;"></i>
            </div>
            <div>
                <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Status</small>
                <span id="summary-status-pill" class="status-pill status-{{ strtolower(str_replace(' ', '-', $requestData->status)) }}" style="margin-top: 0.2rem; display: inline-block;">{{ $requestData->status }}</span>
            </div>
        </div>
        <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
            <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                <i class='bx bx-calendar' style="color: #ad246d; font-size: 1.2rem;"></i>
            </div>
            <div>
                <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Submitted</small>
                <strong style="color: #3b2e43; font-size: 0.85rem;">{{ $requestData->created_at->format('M d, Y') }}</strong>
            </div>
        </div>
        <div class="summary-item" style="background: #fff; border: 1px solid #ead7e8; border-radius: 12px; padding: 0.8rem; display: flex; align-items: center; gap: 0.75rem;">
            <div style="background: #fdf2f8; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;">
                <i class='bx bx-user' style="color: #ad246d; font-size: 1.2rem;"></i>
            </div>
            <div>
                <small style="display: block; color: #8c7895; font-size: 0.7rem; text-transform: uppercase; font-weight: 800;">Name</small>
                <strong style="color: #3b2e43; font-size: 0.85rem;">{{ auth()->user()->first_name }} {{ auth()->user()->last_name }}</strong>
            </div>
        </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start;">
        <!-- Status Timeline -->
        <div class="timeline-section" style="background: #fff; border: 1px solid #ead7e8; border-radius: 16px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <i class='bx bx-git-commit' style="color: #ad246d; font-size: 1.4rem;"></i>
                <h3 style="margin: 0;">Request Timeline</h3>
            </div>
            <div class="timeline" id="request-timeline" style="padding-left: 0.5rem;">
                @forelse($requestData->statusHistories()->orderBy('created_at', 'desc')->get() as $history)
                <div class="timeline-item" style="border-left: 2px solid #f2ebf4; padding-left: 1.5rem; padding-bottom: 1.25rem; position: relative;">
                    <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; background: #ad246d; border-radius: 50%; border: 2px solid #fff;"></div>
                    <div class="timeline-meta" style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <strong style="font-size: 0.9rem; color: #ad246d;">{{ $history->status }}</strong>
                        <time style="font-size: 0.75rem; color: #8c7895;">{{ $history->created_at->format('M d, Y h:i A') }}</time>
                    </div>
                    <div class="timeline-desc" style="background: #fdf7fb; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #f2ebf4; font-size: 0.85rem; color: #4d3f56;">
                        @php
                            $note = $history->notes ?? 'Status changed to ' . $history->status;
                            if (str_contains($note, ': ')) {
                                $note = \Illuminate\Support\Str::after($note, ': ');
                            }
                        @endphp
                        {{ $note }}
                    </div>
                </div>
                @empty
                <div class="timeline-item" style="border-left: 2px solid #f2ebf4; padding-left: 1.5rem; position: relative;">
                    <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; background: #ad246d; border-radius: 50%; border: 2px solid #fff;"></div>
                    <div class="timeline-meta" style="margin-bottom: 0.25rem;">
                        <strong style="font-size: 0.9rem; color: #ad246d;">Submitted</strong>
                    </div>
                    <div class="timeline-desc" style="background: #fdf7fb; padding: 0.6rem 0.8rem; border-radius: 8px; border: 1px solid #f2ebf4; font-size: 0.85rem; color: #4d3f56;">
                        Request record received and queued for review.
                    </div>
                </div>
                @endforelse
            </div>
        </div>

        <!-- Request Details Box -->
        <div class="details-box" style="background: #fff; border: 1px solid #ead7e8; border-radius: 16px; padding: 1.25rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                <i class='bx bx-info-square' style="color: #ad246d; font-size: 1.4rem;"></i>
                <h3 style="margin: 0;">Request Information</h3>
            </div>
            <div class="details-content" id="request-details" style="display: grid; gap: 0.5rem; font-size: 0.88rem;">
                <p style="margin: 0;"><strong>Contact Number:</strong> {{ $requestData->contact_number ?? 'N/A' }}</p>
                <p style="margin: 0;"><strong>Gender:</strong> {{ ucfirst($requestData->gender ?? 'N/A') }}</p>
                <p style="margin: 0;"><strong>Story:</strong> <span style="font-style: italic; color: #665772;">"{{ $requestData->story ?? 'N/A' }}"</span></p>
                <p style="margin: 0;"><strong>Wig Size:</strong> {{ ucfirst($requestData->wig_length ?? 'N/A') }}</p>
                <p style="margin: 0; margin-bottom: 0.5rem;"><strong>Wig Color:</strong> {{ ucfirst($requestData->wig_color ?? 'N/A') }}</p>
                
            </div>

            <div style="margin-top: 1.25rem; border-top: 1px dashed #ead7e8; padding-top: 1rem;">
                <div style="display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.8rem;">
                    <i class='bx bx-paperclip' style="color: #ad246d;"></i>
                    <h3 style="margin: 0; font-size: 1rem;">Attachments</h3>
                </div>
                <div class="file-preview-grid" style="display: flex; flex-wrap: wrap; gap: 0.6rem;">
                    @php
                        $docs = is_array($requestData->documents) ? $requestData->documents : (is_string($requestData->documents) ? json_decode($requestData->documents, true) : []);
                        $photo = $requestData->additional_photo;
                        $hasAny = false;
                    @endphp

                    @if($requestData->diagnosis_photo_url)
                        @php $hasAny = true; @endphp
                        <div class="file-preview-item" style="width: 100px;">
                            <a href="{{ $requestData->diagnosis_photo_url }}" target="_blank" class="file-thumbnail" style="width: 100px; height: 100px; border-radius: 10px; border: 1px solid #ead7e8; overflow: hidden; display: block; position: relative;">
                                <img src="{{ $requestData->diagnosis_photo_url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                <div class="preview-overlay" style="position: absolute; inset: 0; background: rgba(173, 36, 109, 0.4); opacity: 0; display: flex; align-items: center; justify-content: center; color: #fff; transition: opacity 0.2s;"><i class='bx bx-search'></i></div>
                            </a>
                            <span style="display: block; text-align: center; font-size: 0.65rem; font-weight: 700; color: #8c7895; margin-top: 0.25rem;">Medical Photo</span>
                        </div>
                    @endif

                    @if($requestData->additional_photo_url)
                        @php $hasAny = true; @endphp
                        <div class="file-preview-item" style="width: 100px;">
                            <a href="{{ $requestData->additional_photo_url }}" target="_blank" class="file-thumbnail" style="width: 100px; height: 100px; border-radius: 10px; border: 1px solid #ead7e8; overflow: hidden; display: block; position: relative;">
                                <img src="{{ $requestData->additional_photo_url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                <div class="preview-overlay" style="position: absolute; inset: 0; background: rgba(173, 36, 109, 0.4); opacity: 0; display: flex; align-items: center; justify-content: center; color: #fff; transition: opacity 0.2s;"><i class='bx bx-plus'></i></div>
                            </a>
                            <span style="display: block; text-align: center; font-size: 0.65rem; font-weight: 700; color: #8c7895; margin-top: 0.25rem;">Reference</span>
                        </div>
                    @endif

                    @if(count($requestData->documents_urls) > 0)
                        @foreach($requestData->documents_urls as $index => $url)
                            @php $hasAny = true; @endphp
                                <div class="file-preview-item" style="width: 100px;">
                                    @php 
                                        $ext = pathinfo($url, PATHINFO_EXTENSION);
                                        // Strip query params if any
                                        $ext = explode('?', $ext)[0];
                                        $isImg = in_array(strtolower($ext), ['jpg','jpeg','png','webp','gif','svg']); 
                                    @endphp
                                    <a href="{{ $url }}" target="_blank" class="file-thumbnail" style="width: 100px; height: 100px; border-radius: 10px; border: 1px solid #ead7e8; overflow: hidden; display: block; position: relative;">
                                    @if($isImg)
                                        <img src="{{ $url }}" style="width: 100%; height: 100%; object-fit: cover;">
                                    @else
                                        <div style="background: #fdf7fb; width: 100%; height: 100%; display: grid; place-items: center;"><i class='bx bxs-file-blank' style="color: #ad246d; font-size: 1.5rem;"></i></div>
                                    @endif
                                    <div class="preview-overlay" style="position: absolute; inset: 0; background: rgba(173, 36, 109, 0.4); opacity: 0; display: flex; align-items: center; justify-content: center; color: #fff; transition: opacity 0.2s;"><i class='bx bx-link-external'></i></div>
                                </a>
                                <span style="display: block; text-align: center; font-size: 0.65rem; font-weight: 700; color: #8c7895; margin-top: 0.25rem;">Doc #{{ $index + 1 }}</span>
                            </div>
                        @endforeach
                    @endif

                    @if(!$hasAny)
                        <p style="grid-column: 1/-1; color: #8c7895; font-size: 0.8rem; font-style: italic; text-align: center;">No attachments provided.</p>
                    @endif
                </div>
            </div>
        </div>
    </div>

    <div class="action-row" style="margin-top: 1.5rem; display: flex; gap: 0.8rem;">
        <a href="{{ route('recipient.tracking') }}" class="soft-btn" style="padding: 0.8rem 2rem; font-weight: 800;">Back to My Request Tracking</a>
    </div>
</div>
</div>
@endsection

@push('scripts')
    <script src="{{ asset('assets/js/recipient-module.js') }}" defer></script>
    <script src="{{ asset('assets/js/recipient-tracking-detail.js') }}" defer></script>
@endpush

