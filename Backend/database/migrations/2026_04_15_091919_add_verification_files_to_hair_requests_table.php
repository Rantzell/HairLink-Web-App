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
            $table->string('medical_certificate')->nullable()->after('story');
            $table->string('diagnosis_photo')->nullable()->after('medical_certificate');
            $table->string('recipient_photo')->nullable()->after('diagnosis_photo');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hair_requests', function (Blueprint $table) {
            $table->dropColumn(['medical_certificate', 'diagnosis_photo', 'recipient_photo']);
        });
    }
};
