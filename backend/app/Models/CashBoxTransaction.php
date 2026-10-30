<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashBoxTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'transaction_type',
        'amount',
        'source',
        'stock_transaction_id',
        'description',
        'current_balance',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'current_balance' => 'decimal:2',
    ];

    public function stockTransaction(): BelongsTo
    {
        return $this->belongsTo(StockTransaction::class);
    }
}
