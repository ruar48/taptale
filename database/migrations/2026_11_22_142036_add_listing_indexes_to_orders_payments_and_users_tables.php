<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Index the newest-first listings so they read the top rows instead of
     * sorting the whole table.
     *
     * - orders.created_at: the unfiltered admin order list, recent orders
     *   and "orders this month" on the admin dashboard.
     * - payments.created_at: the admin payment list with the "all" filter.
     * - users (is_admin, created_at): the admin list lookup that runs on
     *   every order alert, the customer count, and the customer list.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index('created_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index(['is_admin', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->dropIndex(['created_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['is_admin', 'created_at']);
        });
    }
};
