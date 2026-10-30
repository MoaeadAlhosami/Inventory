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
        Schema::create('cash_box_transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('transaction_type', ['INCOME', 'EXPENSE']);
            $table->decimal('amount', 12, 2);
            $table->enum('source', ['EXTERNAL_SALE', 'GARAGE_JOB', 'PURCHASE', 'MANUAL_DEPOSIT', 'MANUAL_WITHDRAW']);
            $table->foreignId('stock_transaction_id')->nullable()->constrained('stock_transactions')->nullOnDelete();
            $table->string('description');
            $table->decimal('current_balance', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_box_transactions');
    }
};
