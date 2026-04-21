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
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reference')->unique();
            $table->string('hair_length');
            $table->string('hair_color');
            $table->boolean('treated_hair')->default(false);
            $table->text('address')->nullable();
            $table->text('reason')->nullable();
            $table->string('dropoff_location')->nullable();
            $table->timestamp('appointment_at')->nullable();
            $table->string('status')->default('Submitted');
            $table->string('certificate_no')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
