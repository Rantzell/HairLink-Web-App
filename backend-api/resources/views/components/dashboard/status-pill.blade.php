@props([
    'status'
])

@php
    $normalizedStatus = strtolower(trim($status));
    $classes = match($normalizedStatus) {
        'submitted', 'pending', 'assigned' => 'bg-amber-50 text-amber-700 border-amber-200',
        'verified', 'validated', 'completed', 'approved' => 'bg-green-50 text-green-700 border-green-200',
        'rejected', 'cancelled' => 'bg-red-50 text-red-700 border-red-200',
        'processing', 'in progress', 'in-progress' => 'bg-blue-50 text-blue-700 border-blue-200',
        default => 'bg-gray-50 text-gray-700 border-gray-200',
    };
@endphp

<span {{ $attributes->merge(['class' => "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border $classes"]) }}>
    {{ str_replace('-', ' ', ucfirst($status)) }}
</span>
