@props([
    'headers' => [],
    'iterations' => []
])

<div {{ $attributes->merge(['class' => 'admin-surface rounded-2xl border border-[#f2ebf4] overflow-hidden bg-white']) }}>
    <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="bg-[#fdf7fb] border-b border-[#f2ebf4]">
                    @foreach($headers as $header)
                        <th class="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#ad246d]">{{ $header }}</th>
                    @endforeach
                </tr>
            </thead>
            <tbody class="divide-y divide-[#f2ebf4]">
                {{ $slot }}
            </tbody>
        </table>
    </div>
</div>
