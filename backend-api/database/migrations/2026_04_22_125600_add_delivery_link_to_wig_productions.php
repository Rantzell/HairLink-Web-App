<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wig_productions', function (Blueprint $table) {
            $table->string('delivery_link')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('wig_productions', function (Blueprint $table) {
            $table->dropColumn('delivery_link');
        });
    }
};
