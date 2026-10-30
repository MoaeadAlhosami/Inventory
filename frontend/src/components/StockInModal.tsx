import React, { useState } from 'react';
import type { Product } from '../types/inventory';
import { api } from '../services/api';
import { AlertCircle, X, ArrowDownLeft } from 'lucide-react';

interface Props {
    product: Product;
    lang: 'en' | 'ar';
    onClose: () => void;
    onSuccess: () => void;
}

export const StockInModal: React.FC<Props> = ({ product, lang, onClose, onSuccess }) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [purchaseCost, setPurchaseCost] = useState<number>(Number(product.purchase_cost) || 0);
    const [paidFromCashBox, setPaidFromCashBox] = useState<boolean>(false);
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isAr = lang === 'ar';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/inventory/stock-in', {
                product_id: product.id,
                quantity,
                purchase_cost: purchaseCost,
                paid_from_cash_box: paidFromCashBox,
                notes,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء تسجيل الإيداع' : 'Failed to record stock in'));
        } finally {
            setLoading(false);
        }
    };

    const totalCost = (quantity * purchaseCost).toFixed(2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
                {/* Header */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400">
                            <ArrowDownLeft size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                {isAr ? 'توريد / شراء بضاعة للمستودع' : 'Stock In / Receive Inventory'}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">{product.item_code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3.5 text-xs font-medium text-red-600 dark:text-red-400">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Product Info Box */}
                    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-4 border border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                        <div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{isAr ? 'الصنف' : 'Product'}</div>
                            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">{product.product_name}</div>
                        </div>
                        <div className="text-right shrink-0 pl-3 border-l border-zinc-200 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{isAr ? 'التكلفة الحالية' : 'Current Avg Cost'}</div>
                            <div className="font-mono font-bold text-sm text-zinc-800 dark:text-zinc-200">{Number(product.purchase_cost).toFixed(2)} AED</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? 'الكمية الواردة الجديدة' : 'Incoming Quantity'}
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? 'سعر شراء الحبة (AED)' : 'Unit Purchase Cost (AED)'}
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={purchaseCost}
                                onChange={(e) => setPurchaseCost(Number(e.target.value))}
                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                                required
                            />
                        </div>
                    </div>

                    {/* Cash Box Deduction Option */}
                    <label
                        htmlFor="cashCheck"
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${paidFromCashBox
                                ? 'bg-amber-500/10 border-amber-500/40 dark:bg-amber-500/10 dark:border-amber-500/40'
                                : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="cashCheck"
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
                            {totalCost} AED
                        </span>
                    </label>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            {isAr ? 'ملاحظات التوريد (اسم المورد / رقم الفاتورة)' : 'Supplier / Invoice Reference'}
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isAr ? 'اختياري...' : 'e.g., Supplier name or invoice #'}
                            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                        />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
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
                            className="w-2/3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
                        >
                            {loading ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'تأكيد الإيداع وتحديث التكلفة' : 'Confirm Stock In')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};