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
        Schema::create('haircare_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('category');
            $table->string('author')->default('HairLink Team');
            $table->text('excerpt')->nullable();
            $table->longText('content');
            $table->integer('read_time')->default(5);
            $table->string('image')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('haircare_articles');
    }
};
