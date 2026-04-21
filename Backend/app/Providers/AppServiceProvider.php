<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    public function boot(\Illuminate\Http\Request $request): void
    {
        if (app()->environment('local')) {
            \Illuminate\Support\Facades\URL::forceRootUrl($request->getSchemeAndHttpHost());
            if (str_contains($request->getHttpHost(), 'loca.lt') || str_contains($request->getHttpHost(), 'ngrok')) {
                \Illuminate\Support\Facades\URL::forceScheme('https');
            }
        }
    }
}
