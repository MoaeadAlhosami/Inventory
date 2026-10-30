<?php

namespace App\Services;

use App\Models\Product;
use App\Models\StockTransaction;
use Illuminate\Support\Facades\DB;
use Exception;

class InventoryService
{
    protected CashBoxService $cashBoxService;

    public function __construct(CashBoxService $cashBoxService)
    {
        $this->cashBoxService = $cashBoxService;
    }

    // 1. حركة إيداع / شراء بضاعة جديدة (Stock In)
    public function stockIn(int $productId, float $quantity, float $purchaseCost, bool $paidFromCashBox, ?string $notes = null): StockTransaction
    {
        return DB::transaction(function () use ($productId, $quantity, $purchaseCost, $paidFromCashBox, $notes) {
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($productId);

            $currentQty = (float)$product->quantity;
            $currentCost = (float)$product->purchase_cost;
            $newTotalQty = $currentQty + $quantity;

            // حساب متوسط التكلفة المرجح التلقائي
            $newAverageCost = ($newTotalQty > 0)
                ? (($currentQty * $currentCost) + ($quantity * $purchaseCost)) / $newTotalQty
                : $purchaseCost;

            $product->update([
                'quantity'      => $newTotalQty,
                'purchase_cost' => round($newAverageCost, 3),
            ]);

            $tx = StockTransaction::create([
                'product_id'   => $product->id,
                'type'         => 'IN',
                'quantity'     => $quantity,
                'unit_cost'    => $purchaseCost,
                'unit_price'   => 0,
                'affects_cash' => $paidFromCashBox,
                'notes'        => $notes,
            ]);

            // إذا دُفع المبلغ من صندوق المحل نخصمه فوراً
            if ($paidFromCashBox) {
                $totalPaid = $quantity * $purchaseCost;
                $this->cashBoxService->recordTransaction(
                    'EXPENSE',
                    $totalPaid,
                    'PURCHASE',
                    "Purchase Stock: {$product->product_name} ({$quantity} pcs)",
                    $tx->id
                );
            }

            return $tx;
        });
    }

    // 2. حركة صرف / بيع (Stock Out)
    public function stockOut(int $productId, float $quantity, float $sellingPrice, string $type, ?string $notes = null): StockTransaction
    {
        return DB::transaction(function () use ($productId, $quantity, $sellingPrice, $type, $notes) {
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($productId);

            if ($product->quantity < $quantity) {
                throw new Exception("الكمية المتوفرة بالمخزن ({$product->quantity}) غير كافية لإتمام السحب ({$quantity})");
            }

            $product->decrement('quantity', $quantity);

            $isExternal = ($type === 'OUT_EXTERNAL');

            $tx = StockTransaction::create([
                'product_id'   => $product->id,
                'type'         => $type,
                'quantity'     => $quantity,
                'unit_cost'    => $product->purchase_cost,
                'unit_price'   => $sellingPrice,
                'affects_cash' => $isExternal,
                'notes'        => $notes,
            ]);

            // إذا كان بيع خارجي يدخل كاش للصندوق فوراً
            if ($isExternal) {
                $totalReceived = $quantity * $sellingPrice;
                $this->cashBoxService->recordTransaction(
                    'INCOME',
                    $totalReceived,
                    'EXTERNAL_SALE',
                    "External Sale: {$product->product_name} ({$quantity} pcs)",
                    $tx->id
                );
            }

            return $tx;
        });
    }

    // 3. تسوية جرد يدوي (Adjustment)
    public function adjustStock(int $productId, float $newQuantity, string $reason): StockTransaction
    {
        return DB::transaction(function () use ($productId, $newQuantity, $reason) {
            /** @var Product $product */
            $product = Product::lockForUpdate()->findOrFail($productId);
            $diff = $newQuantity - (float)$product->quantity;

            $product->update(['quantity' => $newQuantity]);

            return StockTransaction::create([
                'product_id'   => $product->id,
                'type'         => 'ADJUSTMENT',
                'quantity'     => $diff,
                'unit_cost'    => $product->purchase_cost,
                'unit_price'   => 0,
                'affects_cash' => false,
                'notes'        => "Stock Adjustment: {$reason} (Diff: {$diff})",
            ]);
        });
    }
}
