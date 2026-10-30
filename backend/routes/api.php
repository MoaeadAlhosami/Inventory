<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\CashBoxController;

Route::prefix('v1')->group(function () {
    // Inventory & Products
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
    Route::put('/inventory/{product}', [InventoryController::class, 'update']);
    Route::delete('/inventory/{product}', [InventoryController::class, 'archive']);

    // Summary, Categories, Transactions & Export
    Route::get('/inventory/summary', [InventoryController::class, 'summary']);
    Route::get('/inventory/categories', [InventoryController::class, 'categories']);
    Route::post('/inventory/categories', [InventoryController::class, 'storeCategory']);
    Route::get('/inventory/transactions', [InventoryController::class, 'transactions']);
    Route::get('/inventory/export', [InventoryController::class, 'exportExcel']);

    // Stock Operations
    Route::post('/inventory/stock-out', [InventoryController::class, 'stockOut']);
    Route::post('/inventory/stock-in', [InventoryController::class, 'stockIn']);
    Route::post('/inventory/adjust', [InventoryController::class, 'adjustStock']);

    // Cash Box
    Route::get('/cashbox', [InventoryController::class, 'index']);
    Route::get('/cashbox', [CashBoxController::class, 'index']);
    Route::post('/cashbox/manual', [CashBoxController::class, 'manualTransaction']);
});
