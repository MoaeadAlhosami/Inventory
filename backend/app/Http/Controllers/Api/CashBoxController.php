<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashBoxTransaction;
use App\Services\CashBoxService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CashBoxController extends Controller
{
    protected CashBoxService $cashBoxService;

    public function __construct(CashBoxService $cashBoxService)
    {
        $this->cashBoxService = $cashBoxService;
    }

    public function index(): JsonResponse
    {
        $transactions = CashBoxTransaction::with('stockTransaction.product')->latest('id')->paginate(30);
        $currentBalance = $this->cashBoxService->getCurrentBalance();

        return response()->json([
            'current_balance' => $currentBalance,
            'transactions'    => $transactions,
        ]);
    }

    public function manualTransaction(Request $request): JsonResponse
    {
        $request->validate([
            'type'        => 'required|in:INCOME,EXPENSE',
            'amount'      => 'required|numeric|min:0.01',
            'description' => 'required|string',
        ]);

        $source = ($request->type === 'INCOME') ? 'MANUAL_DEPOSIT' : 'MANUAL_WITHDRAW';

        $tx = $this->cashBoxService->recordTransaction(
            $request->type,
            (float)$request->amount,
            $source,
            $request->description
        );

        return response()->json(['message' => 'تم تسجيل حركة الصندوق بنجاح', 'transaction' => $tx]);
    }
}
