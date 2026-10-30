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
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained()->cascadeOnDelete();
            $table->string('item_code')->unique()->index();
            $table->string('product_name');
            $table->decimal('quantity', 10, 2)->default(0);
            $table->decimal('purchase_cost', 12, 3)->default(0);
            $table->decimal('selling_price', 12, 3)->nullable();
            $table->integer('min_stock_level')->default(2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
