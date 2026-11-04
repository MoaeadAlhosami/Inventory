<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CashBoxController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LinkScanController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

    // Public: each open of the links page counts as one QR code scan.
    Route::post('/links/scan', [LinkScanController::class, 'record'])->middleware('throttle:120,1');

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

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

        // QR code scans from the public links page
        Route::get('/links/scans', [LinkScanController::class, 'show']);

        // Cash Box
        Route::get('/cashbox', [CashBoxController::class, 'index']);
        Route::post('/cashbox/manual', [CashBoxController::class, 'manualTransaction']);
    });
});
