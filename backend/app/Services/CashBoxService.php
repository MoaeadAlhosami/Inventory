<?php

namespace App\Services;

use App\Models\CashBoxTransaction;
use Illuminate\Support\Facades\DB;

class CashBoxService
{
    public function getCurrentBalance(): float
    {
        $lastTx = CashBoxTransaction::latest('id')->first();
        return $lastTx ? (float)$lastTx->current_balance : 0.0;
    }

    public function recordTransaction(
        string $type, // 'INCOME' | 'EXPENSE'
        float $amount,
        string $source, // 'EXTERNAL_SALE' | 'GARAGE_JOB' | 'PURCHASE' | 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAW'
        string $description,
        ?int $stockTransactionId = null
    ): CashBoxTransaction {
        return DB::transaction(function () use ($type, $amount, $source, $description, $stockTransactionId) {
            $currentBalance = $this->getCurrentBalance();
            $newBalance = ($type === 'INCOME') ? ($currentBalance + $amount) : ($currentBalance - $amount);

            return CashBoxTransaction::create([
                'transaction_type'     => $type,
                'amount'               => $amount,
                'source'               => $source,
                'stock_transaction_id' => $stockTransactionId,
                'description'          => $description,
                'current_balance'      => $newBalance,
            ]);
        });
    }
}
