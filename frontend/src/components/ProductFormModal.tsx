import React, { useState } from 'react';
import type { Product, Category } from '../types/inventory';
import { api } from '../services/api';
import { X, PackagePlus, Edit3, Sliders, AlertCircle } from 'lucide-react';

interface Props {
    product?: Product | null; // إذا كان موجوداً يعني تعديل، وإذا null يعني إضافة جديد
    mode: 'CREATE' | 'EDIT' | 'ADJUST';
    categories: Category[];
    lang: 'en' | 'ar';
    onClose: () => void;
    onSuccess: () => void;
}

export const ProductFormModal: React.FC<Props> = ({ product, mode, categories, lang, onClose, onSuccess }) => {
    const isAr = lang === 'ar';

    const [categoryId, setCategoryId] = useState<number>(product?.category_id || (categories[0]?.id ?? 1));
    const [itemCode, setItemCode] = useState<string>(product?.item_code || '');
    const [productName, setProductName] = useState<string>(product?.product_name || '');
    const [initialQuantity, setInitialQuantity] = useState<number>(0);
    const [purchaseCost, setPurchaseCost] = useState<number>(Number(product?.purchase_cost) || 0);
    const [sellingPrice, setSellingPrice] = useState<string>(product?.selling_price ? String(product.selling_price) : '');
    const [minStockLevel, setMinStockLevel] = useState<number>(product?.min_stock_level ?? 2);
    const [paidFromCashBox, setPaidFromCashBox] = useState<boolean>(false);

    // لحالة تسوية الجرد (ADJUST)
    const [newQuantity, setNewQuantity] = useState<number>(Number(product?.quantity) || 0);
    const [reason, setReason] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (mode === 'CREATE') {
                await api.post('/inventory', {
                    category_id: categoryId,
                    item_code: itemCode,
                    product_name: productName,
                    initial_quantity: initialQuantity,
                    purchase_cost: purchaseCost,
                    selling_price: sellingPrice === '' ? null : Number(sellingPrice),
                    min_stock_level: minStockLevel,
                    paid_from_cash_box: paidFromCashBox,
                });
            } else if (mode === 'EDIT' && product) {
                await api.put(`/inventory/${product.id}`, {
                    category_id: categoryId,
                    item_code: itemCode,
                    product_name: productName,
                    selling_price: sellingPrice === '' ? null : Number(sellingPrice),
                    min_stock_level: minStockLevel,
                });
            } else if (mode === 'ADJUST' && product) {
                await api.post('/inventory/adjust', {
                    product_id: product.id,
                    new_quantity: newQuantity,
                    reason,
                });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || (isAr ? 'يرجى التأكد من صحة البيانات المدخلة وعدم تكرار الكود' : 'Validation error: check inputs or duplicate item code'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-red-600/10 text-red-600">
                            {mode === 'CREATE' && <PackagePlus size={20} />}
                            {mode === 'EDIT' && <Edit3 size={20} />}
                            {mode === 'ADJUST' && <Sliders size={20} />}
                        </div>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                            {mode === 'CREATE' && (isAr ? 'إضافة صنف جديد للمستودع' : 'Add New Product to Inventory')}
                            {mode === 'EDIT' && (isAr ? 'تعديل بيانات الصنف' : 'Edit Product Details')}
                            {mode === 'ADJUST' && (isAr ? 'تسوية وضبط الجرد الفعلي' : 'Inventory Stock Adjustment')}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {mode === 'ADJUST' && product ? (
                        <>
                            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-4 border border-zinc-200 dark:border-zinc-800">
                                <div className="text-xs text-zinc-500 font-mono">{product.item_code}</div>
                                <div className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">{product.product_name}</div>
                                <div className="text-xs text-zinc-500 mt-2">
                                    {isAr ? 'الكمية المسجلة حالياً بالنظام:' : 'Current System Quantity:'}{' '}
                                    <span className="font-mono font-bold text-zinc-900 dark:text-white">{Number(product.quantity)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? 'الكمية الفعلية الصحيحة بعد الجرد' : 'New Actual Physical Quantity'}
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    value={newQuantity}
                                    onChange={(e) => setNewQuantity(Number(e.target.value))}
                                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? 'سبب تعديل الكمية (إجباري للتدقيق)' : 'Adjustment Reason (Required for Audit)'}
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder={isAr ? 'مثال: جرد سنوي، قطعة تالفة، خطأ إدخال سابق...' : 'e.g., Physical count audit, damaged item...'}
                                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                    required
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? 'كود القطعة (Part Number)' : 'Item Code / Part Number'}
                                    </label>
                                    <input
                                        type="text"
                                        value={itemCode}
                                        onChange={(e) => setItemCode(e.target.value)}
                                        placeholder="e.g. VWR1200R601E"
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm font-mono uppercase text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? 'التصنيف (Category)' : 'Category'}
                                    </label>
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(Number(e.target.value))}
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                    >
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                    {isAr ? 'اسم ووصف القطعة' : 'Product Name & Description'}
                                </label>
                                <input
                                    type="text"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    placeholder="e.g. RACINGLINE R600 COLD AIR INTAKE..."
                                    className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                    required
                                />
                            </div>

                            {mode === 'CREATE' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                                {isAr ? 'الرصيد الافتتاحي (الكمية)' : 'Initial Quantity'}
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={initialQuantity}
                                                onChange={(e) => setInitialQuantity(Number(e.target.value))}
                                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                                {isAr ? 'سعر التكلفة (AED)' : 'Purchase Cost (AED)'}
                                            </label>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                value={purchaseCost}
                                                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <label
                                        htmlFor="createCashCheck"
                                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${paidFromCashBox
                                            ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/10 dark:border-amber-500/40'
                                            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="createCashCheck"
                                                checked={paidFromCashBox}
                                                onChange={(e) => setPaidFromCashBox(e.target.checked)}
                                                className="h-4 w-4 rounded border-zinc-400 text-red-600 focus:ring-0"
                                            />
                                            <div>
                                                <div className="text-xs font-bold text-zinc-900 dark:text-white">
                                                    {isAr ? 'تم دفع المبلغ نقداً من صندوق المحل' : 'Paid in Cash from Shop Cash Box'}
                                                </div>
                                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    {isAr ? 'سيتم خصم إجمالي الفاتورة من رصيد الصندوق الحالي تلقائياً' : 'Will automatically deduct total cost from current cash balance'}
                                                </div>
                                            </div>
                                        </div>
                                        <span className="font-mono text-sm font-extrabold text-zinc-900 dark:text-white">
                                            {(initialQuantity * purchaseCost).toFixed(2)} AED
                                        </span>
                                    </label>
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? 'سعر البيع الافتراضي (AED)' : 'Default Selling Price (AED)'}
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value)}
                                        placeholder={isAr ? 'اختياري...' : 'Optional'}
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                        {isAr ? 'حد التنبيه للنواقص' : 'Low Stock Alert Level'}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={minStockLevel}
                                        onChange={(e) => setMinStockLevel(Number(e.target.value))}
                                        className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-sm font-mono text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                        required
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-3 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-1/3 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        >
                            {isAr ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition"
                        >
                            {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ البيانات' : 'Save Changes')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};