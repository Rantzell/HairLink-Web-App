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
        Schema::create('wig_productions', function (Blueprint $table) {
            $table->id();
            $table->string('task_code')->unique();
            $table->foreignId('wigmaker_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('donation_id')->nullable()->constrained('donations')->onDelete('set null');
            $table->string('target_length');
            $table->string('target_color');
            $table->string('status')->default('assigned'); // assigned, processing, testing, completed
            $table->date('due_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('wig_productions');
    }
};
