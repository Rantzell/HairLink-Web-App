@props([
    'title',
    'value',
    'subtitle' => null,
    'icon' => null,
    'type' => 'default' // donor, approved, recipient, pending
])

<article class="admin-stat admin-stat-{{ $type }} bg-white rounded-2xl p-6 border border-[#f2ebf4] relative overflow-hidden transition-all hover:shadow-lg">
    <span class="admin-stat-accent absolute top-0 left-0 bottom-0 w-1.5 bg-[#ad246d]"></span>
    
    <div class="flex items-center gap-3 mb-3 text-[#7a687f]">
        @if($icon)
            <i class='bx {{ $icon }} text-xl text-[#ad246d]'></i>
        @endif
        <span class="text-sm font-semibold tracking-wide uppercase">{{ $title }}</span>
    </div>
    
    <h2 class="text-4xl font-black text-[#ad246d] mb-1 leading-tight">{{ $value }}</h2>
    
    @if($subtitle)
        <p class="text-sm text-[#8c7895] font-medium">{{ $subtitle }}</p>
    @endif
</article>
