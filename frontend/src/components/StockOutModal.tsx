import React, { useState } from 'react';
import type { Product } from '../types/inventory';
import { api } from '../services/api';
import { AlertCircle, X, ArrowUpRight, Wrench, Banknote } from 'lucide-react';

interface Props {
    product: Product;
    lang: 'en' | 'ar';
    onClose: () => void;
    onSuccess: () => void;
}

export const StockOutModal: React.FC<Props> = ({ product, lang, onClose, onSuccess }) => {
    const [quantity, setQuantity] = useState<number>(1);
    const [sellingPrice, setSellingPrice] = useState<number>(Number(product.selling_price) || 0);
    const [type, setType] = useState<'OUT_EXTERNAL' | 'OUT_GARAGE'>('OUT_EXTERNAL');
    const [notes, setNotes] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const isAr = lang === 'ar';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await api.post('/inventory/stock-out', {
                product_id: product.id,
                quantity,
                selling_price: sellingPrice,
                type,
                notes,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || (isAr ? 'حدث خطأ أثناء تنفيذ السحب' : 'Failed to record stock out'));
        } finally {
            setLoading(false);
        }
    };

    const totalAmount = (quantity * sellingPrice).toFixed(2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden transition-all">
                {/* Header */}
                <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-red-600/10 text-red-600 dark:text-red-500">
                            <ArrowUpRight size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                                {isAr ? 'صرف / بيع قطعة من المستودع' : 'Stock Out / Issue Part'}
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
                        <div className="pr-2">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{isAr ? 'اسم القطعة' : 'Product Name'}</div>
                            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">{product.product_name}</div>
                        </div>
                        <div className="text-right shrink-0 pl-3 border-l border-zinc-200 dark:border-zinc-700">
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{isAr ? 'المتوفر' : 'Available'}</div>
                            <div className="font-mono font-extrabold text-base text-emerald-600 dark:text-emerald-400">{Number(product.quantity)}</div>
                        </div>
                    </div>

                    {/* Transaction Type Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                            {isAr ? 'نوع عملية الصرف' : 'Transaction Type'}
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('OUT_EXTERNAL')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${type === 'OUT_EXTERNAL'
                                    ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/20'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                <Banknote size={16} />
                                {isAr ? 'بيع خارجي (كاش للصندوق)' : 'External Sale (+Cash)'}
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('OUT_GARAGE')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-xs font-bold transition-all ${type === 'OUT_GARAGE'
                                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-lg'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                                    }`}
                            >
                                <Wrench size={16} />
                                {isAr ? 'استخدام داخلي (ورشة الكراج)' : 'Internal Garage Job'}
                            </button>
                        </div>
                    </div>

                    {/* Quantity & Selling Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? 'الكمية المصروفة' : 'Quantity'}
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0.01"
                                max={Number(product.quantity)}
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                                {isAr ? 'سعر البيع الفردي (AED)' : 'Unit Selling Price (AED)'}
                            </label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(Number(e.target.value))}
                                className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                required
                            />
                        </div>
                    </div>

                    {/* Total Calculation Banner */}
                    <div className="flex items-center justify-between rounded-xl bg-zinc-100 dark:bg-zinc-800/80 px-4 py-3 border border-zinc-200 dark:border-zinc-700">
                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {type === 'OUT_EXTERNAL'
                                ? (isAr ? 'المبلغ الذي سيُضاف للصندوق:' : 'Cash to be added to Cash Box:')
                                : (isAr ? 'إجمالي قيمة القطع المسحوبة للورشة:' : 'Total Garage Job Value:')}
                        </span>
                        <span className="font-mono text-base font-extrabold text-zinc-900 dark:text-white">
                            {totalAmount} <span className="text-xs font-normal">AED</span>
                        </span>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                            {isAr ? 'ملاحظات (رقم السيارة / اسم الزبون / الفاتورة)' : 'Notes (Car Plate / Customer / Job Card #)'}
                        </label>
                        <input
                            type="text"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={isAr ? 'اكتب تفاصيل إضافية...' : 'Optional reference notes...'}
                            className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                        />
                    </div>

                    {/* Actions */}
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
                            className="w-2/3 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white shadow-lg shadow-red-600/25 transition disabled:opacity-50"
                        >
                            {loading ? (isAr ? 'جاري التنفيذ...' : 'Processing...') : (isAr ? 'تأكيد الصرف' : 'Confirm Stock Out')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};