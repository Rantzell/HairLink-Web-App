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
        Schema::table('hair_requests', function (Blueprint $table) {
            $table->string('wig_length')->nullable()->after('notes');
            $table->string('wig_color')->nullable()->after('wig_length');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hair_requests', function (Blueprint $table) {
            $table->dropColumn(['wig_length', 'wig_color']);
        });
    }
};
