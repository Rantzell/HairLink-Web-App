<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hair_requests', function (Blueprint $table) {
            $table->string('delivery_tracking_link', 2048)->nullable()->after('status');
            $table->timestamp('wig_received_at')->nullable()->after('delivery_tracking_link');
        });
    }

    public function down(): void
    {
        Schema::table('hair_requests', function (Blueprint $table) {
            $table->dropColumn(['delivery_tracking_link', 'wig_received_at']);
        });
    }
};
