<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'item_code',
        'product_name',
        'quantity',
        'purchase_cost',
        'selling_price',
        'min_stock_level',
        'is_active',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'purchase_cost' => 'decimal:3',
        'selling_price' => 'decimal:3',
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function stockTransactions(): HasMany
    {
        return $this->hasMany(StockTransaction::class);
    }
}
