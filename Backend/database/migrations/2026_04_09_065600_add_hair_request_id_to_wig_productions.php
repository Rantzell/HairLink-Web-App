<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('wig_productions', function (Blueprint $table) {
            $table->foreignId('hair_request_id')->nullable()->constrained('hair_requests')->nullOnDelete()->after('donation_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('wig_productions', function (Blueprint $table) {
            $table->dropForeign(['hair_request_id']);
            $table->dropColumn('hair_request_id');
        });
    }
};
