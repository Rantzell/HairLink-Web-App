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
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['donor', 'recipient', 'admin'])->default('donor')->after('id');
            $table->string('first_name')->nullable()->after('role');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('country')->nullable()->after('email');
            $table->string('region')->nullable()->after('country');
            $table->string('postal_code')->nullable()->after('region');
            $table->integer('age')->nullable()->after('postal_code');
            $table->string('gender')->nullable()->after('age');
            $table->string('phone')->nullable()->after('gender');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'first_name',
                'last_name',
                'country',
                'region',
                'postal_code',
                'age',
                'gender',
                'phone'
            ]);
        });
    }
};
