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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('reference')->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status');

            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained()->nullOnDelete();
            $table->string('product_name');
            $table->string('template_name')->nullable();
            $table->json('selected_options');
            $table->string('design_mode');
            $table->json('personalization');
            $table->timestamp('preview_approved_at')->nullable();

            $table->unsignedInteger('quantity');
            $table->unsignedInteger('unit_price');
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('customization_fee')->default(0);
            $table->unsignedInteger('delivery_fee')->default(0);
            $table->integer('adjustment')->default(0);
            $table->string('adjustment_note')->nullable();
            $table->unsignedInteger('total');

            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone', 32);
            $table->string('address_line');
            $table->string('city');
            $table->string('province');
            $table->string('postal_code', 16);
            $table->text('customer_notes')->nullable();

            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->string('courier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
