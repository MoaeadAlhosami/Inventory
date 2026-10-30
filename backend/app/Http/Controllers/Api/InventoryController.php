<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\StockTransaction;
use App\Services\InventoryService;
use App\Exports\InventoryExport;
use Maatwebsite\Excel\Facades\Excel;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class InventoryController extends Controller
{
    protected InventoryService $inventoryService;

    public function __construct(InventoryService $inventoryService)
    {
        $this->inventoryService = $inventoryService;
    }

    // 1. جلب المنتجات مع الفلترة، البحث، والترقيم
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category')->where('is_active', true);

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('item_code', 'like', "%{$s}%")
                    ->orWhere('product_name', 'like', "%{$s}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->boolean('low_stock_only')) {
            $query->whereColumn('quantity', '<=', 'min_stock_level');
        }

        $perPage = $request->input('per_page', 30);
        return response()->json($query->orderBy('id', 'asc')->paginate($perPage));
    }

    // 2. إضافة قطعة جديدة كلياً للمستودع
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'        => 'required|exists:categories,id',
            'item_code'          => 'required|string|max:100|unique:products,item_code',
            'product_name'       => 'required|string|max:255',
            'initial_quantity'   => 'required|numeric|min:0',
            'purchase_cost'      => 'required|numeric|min:0',
            'selling_price'      => 'nullable|numeric|min:0',
            'min_stock_level'    => 'nullable|integer|min:0',
            'paid_from_cash_box' => 'boolean',
        ]);

        $product = Product::create([
            'category_id'     => $validated['category_id'],
            'item_code'       => strtoupper(trim($validated['item_code'])),
            'product_name'    => trim($validated['product_name']),
            'quantity'        => 0,
            'purchase_cost'   => $validated['purchase_cost'],
            'selling_price'   => $validated['selling_price'] ?? null,
            'min_stock_level' => $validated['min_stock_level'] ?? 2,
            'is_active'       => true,
        ]);

        // إذا كان لها رصيد افتتاحي نسجله كحركة إيداع رسمية
        if ($validated['initial_quantity'] > 0) {
            $this->inventoryService->stockIn(
                $product->id,
                (float)$validated['initial_quantity'],
                (float)$validated['purchase_cost'],
                $request->boolean('paid_from_cash_box'),
                'Initial stock on item creation'
            );
        }

        return response()->json([
            'message' => 'Product created successfully',
            'product' => $product->fresh('category')
        ], 201);
    }

    // 3. تعديل البيانات الأساسية للقطعة (الاسم، الكود، سعر البيع، التصنيف)
    public function update(Request $request, Product $product): JsonResponse
    {
        $validated = $request->validate([
            'category_id'     => 'required|exists:categories,id',
            'item_code'       => 'required|string|max:100|unique:products,item_code,' . $product->id,
            'product_name'    => 'required|string|max:255',
            'selling_price'   => 'nullable|numeric|min:0',
            'min_stock_level' => 'required|integer|min:0',
        ]);

        $product->update([
            'category_id'     => $validated['category_id'],
            'item_code'       => strtoupper(trim($validated['item_code'])),
            'product_name'    => trim($validated['product_name']),
            'selling_price'   => $validated['selling_price'],
            'min_stock_level' => $validated['min_stock_level'],
        ]);

        return response()->json([
            'message' => 'Product updated successfully',
            'product' => $product->fresh('category')
        ]);
    }

    // 4. أرشفة القطعة (إخفاؤها دون حذف تاريخها المحاسبي)
    public function archive(Product $product): JsonResponse
    {
        $product->update(['is_active' => false]);
        return response()->json(['message' => 'Product archived successfully']);
    }

    // 5. إحصائيات لوحة التحكم العلوية
    public function summary(): JsonResponse
    {
        $products = Product::where('is_active', true)->get();

        $totalItems = $products->count();
        $totalQuantity = $products->sum('quantity');
        $totalCostValue = $products->sum(fn($p) => (float)$p->quantity * (float)$p->purchase_cost);
        $totalSellingValue = $products->sum(fn($p) => (float)$p->quantity * (float)($p->selling_price ?? 0));
        $lowStockCount = $products->filter(fn($p) => $p->quantity <= $p->min_stock_level)->count();

        return response()->json([
            'total_items'         => $totalItems,
            'total_quantity'      => round($totalQuantity, 2),
            'total_cost_value'    => round($totalCostValue, 2),
            'total_selling_value' => round($totalSellingValue, 2),
            'low_stock_count'     => $lowStockCount,
        ]);
    }

    // 6. سجل حركات المخزون التاريخي (Audit Log)
    public function transactions(Request $request): JsonResponse
    {
        $query = StockTransaction::with('product.category')->latest('id');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->whereHas('product', function ($q) use ($s) {
                $q->where('item_code', 'like', "%{$s}%")
                    ->orWhere('product_name', 'like', "%{$s}%");
            });
        }

        return response()->json($query->paginate(30));
    }

    // 7. تنفيذ سحب / بيع
    public function stockOut(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'    => 'required|exists:products,id',
            'quantity'      => 'required|numeric|min:0.01',
            'selling_price' => 'required|numeric|min:0',
            'type'          => 'required|in:OUT_EXTERNAL,OUT_GARAGE',
            'notes'         => 'nullable|string',
        ]);

        try {
            $tx = $this->inventoryService->stockOut(
                $request->product_id,
                (float)$request->quantity,
                (float)$request->selling_price,
                $request->type,
                $request->notes
            );
            return response()->json(['message' => 'Stock out recorded successfully', 'transaction' => $tx]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    // 8. تنفيذ إيداع / شراء
    public function stockIn(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'         => 'required|exists:products,id',
            'quantity'           => 'required|numeric|min:0.01',
            'purchase_cost'      => 'required|numeric|min:0',
            'paid_from_cash_box' => 'required|boolean',
            'notes'              => 'nullable|string',
        ]);

        $tx = $this->inventoryService->stockIn(
            $request->product_id,
            (float)$request->quantity,
            (float)$request->purchase_cost,
            $request->paid_from_cash_box,
            $request->notes
        );

        return response()->json(['message' => 'Stock in recorded successfully', 'transaction' => $tx]);
    }

    // 9. تعديل الجرد المباشر (تسوية)
    public function adjustStock(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'   => 'required|exists:products,id',
            'new_quantity' => 'required|numeric|min:0',
            'reason'       => 'required|string',
        ]);

        $tx = $this->inventoryService->adjustStock($request->product_id, (float)$request->new_quantity, $request->reason);

        return response()->json(['message' => 'Stock adjusted successfully', 'transaction' => $tx]);
    }

    // 10. جلب التصنيفات أو إنشاء تصنيف جديد
    public function categories(): JsonResponse
    {
        return response()->json(Category::orderBy('name')->get());
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:100|unique:categories,name']);
        $cat = Category::create(['name' => strtoupper(trim($request->name))]);
        return response()->json($cat, 201);
    }

    // 11. تصدير ملف الإكسل المطابق
    public function exportExcel()
    {
        return Excel::download(new InventoryExport, 'VAGLOGIC_INVENTORY.xlsx');
    }
}
