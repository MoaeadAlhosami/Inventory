import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './services/api';
import { getApiErrorMessage, isUnauthorized } from './services/apiError';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './hooks/useAuth';
import type { Product } from './types/inventory';
import { useTheme } from './hooks/useTheme';
import { useToast } from './hooks/useToast';
import { CopyableText } from './components/CopyableText';
import { useCashbox, useCategories, useProducts, useQrScans, useSummary, useTransactions } from './hooks/useInventoryQueries';
import {
  Search,
  Download,
  RefreshCw,
  Plus,
  Sun,
  Moon,
  Warehouse,
  Wallet,
  Boxes,
  AlertTriangle,
  QrCode,
  X,
  LogOut
} from 'lucide-react';

function InventoryApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'cashbox'>('inventory');
  const { isDark, toggleTheme } = useTheme();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Filter states
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [lowStockOnly, setLowStockOnly] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Cached server data (React Query)
  const productsQuery = useProducts({ search: debouncedSearch, categoryId: selectedCategory, lowStockOnly, page });
  const transactionsQuery = useTransactions({ search: debouncedSearch, page }, activeTab === 'transactions');
  const { data: categories = [] } = useCategories();
  const { data: summary } = useSummary();
  const { data: qrScans = 0 } = useQrScans();
  const { data: cashbox } = useCashbox();

  const productsData = productsQuery.data;
  const transactions = transactionsQuery.data;
  const loading = productsQuery.isPending;
  const cashBalance = cashbox?.currentBalance ?? 0;
  const cashTransactions = cashbox?.transactions ?? [];

  // Manual Cash Form
  const [manualType, setManualType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [manualAmount, setManualAmount] = useState<string>('');
  const [manualDesc, setManualDesc] = useState<string>('');

  // Modals state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'ADD' | 'OUT' | 'IN' | 'ADJUST' | 'EDIT';
    product: Product | null;
  }>({
    isOpen: false,
    mode: 'ADD',
    product: null,
  });

  // Modal Form inputs
  const [formSku, setFormSku] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<number>(1);
  const [formMinAlert, setFormMinAlert] = useState<number>(2);
  const [formSellPrice, setFormSellPrice] = useState<string>('');
  const [formOpenQty, setFormOpenQty] = useState<number>(0);
  const [formUnitCost, setFormUnitCost] = useState<string>('');
  const [formOutType, setFormOutType] = useState<'OUT_EXTERNAL' | 'OUT_GARAGE'>('OUT_EXTERNAL');
  const [formNotes, setFormNotes] = useState('');
  const [formReason, setFormReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Invalidate all cached data so every query refetches
  const refreshData = () => queryClient.invalidateQueries();

  const handleForceRefresh = async () => {
    await refreshData();
    const failed = queryClient.getQueryCache().findAll({ predicate: (q) => q.state.status === 'error' });
    if (failed.length > 0) {
      toast.error('Refresh failed', getApiErrorMessage(failed[0].state.error, 'Could not load the latest data.'));
    } else {
      toast.info('Data refreshed', 'All figures are up to date.');
    }
  };

  // Surface background loading failures (products, summary, cash box, audit log)
  const loadError = productsQuery.error ?? transactionsQuery.error;
  useEffect(() => {
    if (loadError && !isUnauthorized(loadError)) {
      toast.error('Failed to load data', getApiErrorMessage(loadError));
    }
  }, [loadError, toast]);

  // Modal Helpers
  const openModal = (mode: 'ADD' | 'OUT' | 'IN' | 'ADJUST' | 'EDIT', product: Product | null = null) => {
    setModalState({ isOpen: true, mode, product });
    setFormNotes('');
    setFormReason('');
    if (product) {
      setFormSku(product.item_code);
      setFormName(product.product_name);
      setFormCategory(product.category_id);
      setFormMinAlert(product.min_stock_level);
      setFormSellPrice(product.selling_price ? String(product.selling_price) : '');
      setFormUnitCost(String(product.purchase_cost));
      setFormOpenQty(Number(product.quantity));
    } else {
      setFormSku('');
      setFormName('');
      setFormCategory(categories[0]?.id || 1);
      setFormMinAlert(2);
      setFormSellPrice('');
      setFormOpenQty(0);
      setFormUnitCost('');
    }
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: 'ADD', product: null });
  };

  useEffect(() => {
    if (!modalState.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen]);

  // Submit Modal Action
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { mode, product } = modalState;
    const failureTitles: Record<typeof mode, string> = {
      ADD: 'Could not add part',
      EDIT: 'Could not update part',
      OUT: 'Stock out failed',
      IN: 'Stock in failed',
      ADJUST: 'Stock adjustment failed',
    };
    try {
      if (modalState.mode === 'ADD') {
        await api.post('/inventory', {
          category_id: formCategory,
          item_code: formSku,
          product_name: formName,
          initial_quantity: formOpenQty,
          purchase_cost: Number(formUnitCost) || 0,
          selling_price: formSellPrice === '' ? null : Number(formSellPrice),
          min_stock_level: formMinAlert,
          paid_from_cash_box: false,
        });
      } else if (modalState.mode === 'EDIT' && modalState.product) {
        await api.put(`/inventory/${modalState.product.id}`, {
          category_id: formCategory,
          item_code: formSku,
          product_name: formName,
          selling_price: formSellPrice === '' ? null : Number(formSellPrice),
          min_stock_level: formMinAlert,
        });
      } else if (modalState.mode === 'OUT' && modalState.product) {
        await api.post('/inventory/stock-out', {
          product_id: modalState.product.id,
          quantity: formOpenQty,
          selling_price: Number(formSellPrice) || 0,
          type: formOutType,
          notes: formNotes,
        });
      } else if (modalState.mode === 'IN' && modalState.product) {
        await api.post('/inventory/stock-in', {
          product_id: modalState.product.id,
          quantity: formOpenQty,
          purchase_cost: Number(formUnitCost) || 0,
          paid_from_cash_box: false,
          notes: formNotes,
        });
      } else if (modalState.mode === 'ADJUST' && modalState.product) {
        await api.post('/inventory/adjust', {
          product_id: modalState.product.id,
          new_quantity: formOpenQty,
          reason: formReason || 'Physical inventory audit',
        });
      }
      closeModal();
      refreshData();

      const code = product?.item_code ?? formSku.toUpperCase();
      switch (mode) {
        case 'ADD':
          toast.success('Part added', `${code} · ${formName} was added to the inventory.`);
          break;
        case 'EDIT':
          toast.success('Part updated', `${code} details were saved.`);
          break;
        case 'OUT':
          toast.success(
            'Stock out recorded',
            `${formOpenQty} × ${code} · ${formOutType === 'OUT_EXTERNAL' ? 'External sale (cash added)' : 'Internal garage job'}`,
          );
          break;
        case 'IN':
          toast.success('Stock in recorded', `${formOpenQty} × ${code} received into the warehouse.`);
          break;
        case 'ADJUST':
          toast.success('Stock adjusted', `${code} quantity set to ${formOpenQty}.`);
          break;
      }
    } catch (err) {
      toast.error(failureTitles[mode], getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Manual Cash Entry
  const handleManualCash = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/cashbox/manual', {
        type: manualType,
        amount: Number(manualAmount),
        description: manualDesc,
      });
      setManualAmount('');
      setManualDesc('');
      refreshData();
      toast.success(
        manualType === 'INCOME' ? 'Income recorded' : 'Expense recorded',
        `${Number(manualAmount).toFixed(2)} AED · ${manualDesc}`,
      );
    } catch (err) {
      toast.error('Cash entry failed', getApiErrorMessage(err));
    }
  };

  const handleExport = async () => {
    try {
      const { data } = await api.get('/inventory/export', { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'VAGLOGIC_INVENTORY.xlsx';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export complete', 'VAGLOGIC_INVENTORY.xlsx was downloaded.');
    } catch (err) {
      toast.error('Export failed', getApiErrorMessage(err, 'Could not generate the Excel file.'));
    }
  };

  return (
    <div className="min-h-screen bg-light-canvas text-slate-900 dark:bg-[#0c0d0e] dark:text-[#e1e4e8] transition-colors duration-200">

      {/* 1. TOP HEADER NAVBAR */}
      <header className="border-b border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#121417] px-6 py-3.5 shadow-sm">
        <div className="max-w-[1700px] mx-auto flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-white px-2.5 py-1 rounded border border-slate-300 dark:border-zinc-700 shadow-sm flex items-center">
              <span className="text-red-600 font-black tracking-tighter text-base italic">VAG</span>
              <span className="text-slate-900 font-extrabold tracking-tight text-base">LOGIC</span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 bg-light-subtle dark:bg-[#1a1d22] p-1 rounded-xl border border-slate-200 dark:border-[#262b32]">
            <button
              onClick={() => { setActiveTab('inventory'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'inventory'
                  ? 'bg-light-surface dark:bg-[#121417] text-red-600 dark:text-red-500 border border-slate-200 dark:border-red-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Inventory & Stock
            </button>
            <button
              onClick={() => { setActiveTab('transactions'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'transactions'
                  ? 'bg-light-surface dark:bg-[#121417] text-red-600 dark:text-red-500 border border-slate-200 dark:border-red-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Stock Audit Log
            </button>
            <button
              onClick={() => { setActiveTab('cashbox'); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'cashbox'
                  ? 'bg-light-surface dark:bg-[#121417] text-red-600 dark:text-red-500 border border-slate-200 dark:border-red-500/30 shadow-sm'
                  : 'text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              Cash Box Ledger
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 bg-[#e52e2e] hover:bg-[#c92424] text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide shadow-sm transition"
            >
              <Download size={15} />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleForceRefresh}
              className="p-2 rounded-lg bg-light-subtle dark:bg-[#1a1d22] border border-slate-200 dark:border-[#262b32] text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-light-subtle dark:bg-[#1a1d22] border border-slate-200 dark:border-[#262b32] text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white transition"
              title="Toggle Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="hidden sm:flex flex-col items-end leading-tight px-1">
              <span className="text-xs font-bold text-slate-800 dark:text-white">{user?.name}</span>
              <span className="text-[10px] text-slate-500 dark:text-[#8b949e]">{user?.email}</span>
            </div>
            <button
              onClick={() => { void logout(); }}
              className="p-2 rounded-lg bg-light-subtle dark:bg-[#1a1d22] border border-slate-200 dark:border-[#262b32] text-slate-600 dark:text-[#8b949e] hover:text-slate-900 dark:hover:text-white transition"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* 2. MAIN VIEWPORT */}
      <main className="max-w-[1700px] mx-auto p-6 space-y-6">

        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">

          {/* QR code scans */}
          <div className="relative rounded-xl bg-light-surface dark:bg-[#14161a] border border-slate-200 dark:border-[#1f2328] p-5 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600"></div>
            <div className="flex items-center justify-between text-slate-500 dark:text-[#8b949e] text-xs font-bold tracking-wider mb-2">
              <span>QR code scans</span>
              <QrCode size={16} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {qrScans.toLocaleString('en-US')}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#6e7681] mt-1.5">links page opens</div>
          </div>

          {/* Card 1: Warehouse Value */}
          <div className="relative rounded-xl bg-light-surface dark:bg-[#14161a] border border-slate-200 dark:border-[#1f2328] p-5 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600"></div>
            <div className="flex items-center justify-between text-slate-500 dark:text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-2">
              <span>WAREHOUSE VALUE (AT COST)</span>
              <Warehouse size={16} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {summary ? Number(summary.total_cost_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#6e7681] mt-1.5">AED</div>
          </div>

          {/* Card 2: Shop Cash Box Balance */}
          <div className="rounded-xl bg-light-surface dark:bg-[#14161a] border border-slate-200 dark:border-[#1f2328] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-2">
              <span>SHOP CASH BOX BALANCE</span>
              <Wallet size={16} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-[#10b981] tracking-tight">
              {Number(cashBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#6e7681] mt-1.5">AED</div>
          </div>

          {/* Card 3: Inventory Count */}
          <div className="relative rounded-xl bg-light-surface dark:bg-[#14161a] border border-slate-200 dark:border-[#1f2328] p-5 shadow-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-600"></div>
            <div className="flex items-center justify-between text-slate-500 dark:text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-2">
              <span>INVENTORY COUNT</span>
              <Boxes size={16} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tight">
              {summary ? Number(summary.total_quantity).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '0.0'}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#6e7681] mt-1.5">
              units · {summary?.total_items || 0} SKUs
            </div>
          </div>

          {/* Card 4: Low Stock Alerts */}
          <div className="rounded-xl bg-light-surface dark:bg-[#14161a] border border-slate-200 dark:border-[#1f2328] p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 dark:text-[#8b949e] text-xs font-bold uppercase tracking-wider mb-2">
              <span>LOW STOCK ALERTS</span>
              <AlertTriangle size={16} />
            </div>
            <div className="text-3xl font-extrabold font-mono text-red-600 dark:text-red-500 tracking-tight">
              {summary?.low_stock_count || 0}
            </div>
            <div className="text-xs font-semibold text-slate-500 dark:text-[#6e7681] mt-1.5">items at/below min</div>
          </div>

        </div>

        {/* ================= TAB 1: INVENTORY & STOCK ================= */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">

            {/* Toolbar Filters & Add New Part Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <div className="relative flex-1 sm:max-w-md">
                  <Search size={16} className="absolute left-3.5 top-3 text-slate-400 dark:text-[#6e7681]" />
                  <input
                    type="text"
                    placeholder="Search part number or name..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-full bg-light-surface dark:bg-[#14161a] border border-slate-300 dark:border-[#262b32] rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500 shadow-sm"
                  />
                </div>

                <select
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
                  className="bg-light-surface dark:bg-[#14161a] border border-slate-300 dark:border-[#262b32] rounded-lg px-3.5 py-2.5 text-sm text-slate-700 dark:text-[#8b949e] focus:outline-none focus:border-red-500 shadow-sm"
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => { setLowStockOnly(!lowStockOnly); setPage(1); }}
                  className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold border transition-all ${lowStockOnly
                      ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-500 border-red-300 dark:border-red-500/40'
                      : 'bg-light-surface dark:bg-[#14161a] border-slate-300 dark:border-[#262b32] text-slate-700 dark:text-[#8b949e]'
                    }`}
                >
                  Low Stock Only
                </button>
              </div>

              <button
                onClick={() => openModal('ADD')}
                className="flex items-center gap-2 bg-[#e52e2e] hover:bg-[#c92424] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm transition"
              >
                <Plus size={16} />
                <span>Add New Part</span>
              </button>
            </div>

            {/* Inventory Table */}
            <div className="rounded-xl border border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#14161a] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-light-muted dark:bg-[#121417] text-slate-600 dark:text-[#8b949e] border-b border-slate-200 dark:border-[#1f2328] uppercase tracking-wider text-xs font-bold">
                    <tr>
                      <th className="py-3.5 px-4">ITEM CODE</th>
                      <th className="py-3.5 px-4">PRODUCT NAME</th>
                      <th className="py-3.5 px-4">CATEGORY</th>
                      <th className="py-3.5 px-4 text-center">STOCK</th>
                      <th className="py-3.5 px-4 text-right">UNIT COST</th>
                      <th className="py-3.5 px-4 text-right">SELL PRICE</th>
                      <th className="py-3.5 px-4 text-right">TOTAL VALUE</th>
                      <th className="py-3.5 px-4 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1f2328]">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-500 dark:text-[#6e7681]">Loading inventory...</td>
                      </tr>
                    ) : productsData?.data.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-500 dark:text-[#6e7681]">No products found matching criteria</td>
                      </tr>
                    ) : (
                      productsData?.data.map((p) => {
                        const qty = Number(p.quantity);
                        const cost = Number(p.purchase_cost);
                        const totalCost = qty * cost;

                        const stockBadgeClass = qty <= 0
                          ? 'bg-red-50 text-red-600 border border-red-200 dark:bg-[#e52e2e]/10 dark:text-red-500 dark:border-red-500/20'
                          : qty <= p.min_stock_level
                            ? 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/20'
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';

                        return (
                          <tr key={p.id} className="hover:bg-light-muted dark:hover:bg-[#181a1f] transition">
                            <td className="py-3 px-4 font-mono font-bold text-red-600 dark:text-red-500 whitespace-nowrap max-w-[200px]">
                              <CopyableText value={p.item_code} label="Item code" />
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-sm">
                              <CopyableText value={p.product_name} label="Product name" />
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="bg-light-subtle text-slate-700 dark:bg-[#1c1f24] dark:text-[#8b949e] text-xs font-bold px-2.5 py-1 rounded-full uppercase">
                                {p.category?.name || 'UPGRADE PARTS'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`inline-block font-mono font-bold px-3 py-1 rounded-full text-xs ${stockBadgeClass}`}>
                                {qty}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800 dark:text-[#c9d1d9] whitespace-nowrap">
                              {cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500 dark:text-[#8b949e] whitespace-nowrap">
                              {p.selling_price ? Number(p.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openModal('OUT', p)}
                                  disabled={qty <= 0}
                                  className="px-3 py-1.5 rounded-lg bg-light-surface border border-slate-300 text-slate-800 hover:border-red-500 dark:bg-[#1f2328] dark:border-[#30363d] dark:text-white dark:hover:border-red-500 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition"
                                >
                                  Out
                                </button>
                                <button
                                  onClick={() => openModal('IN', p)}
                                  className="px-3 py-1.5 rounded-lg bg-light-surface border border-slate-300 text-slate-800 hover:border-emerald-500 dark:bg-[#1f2328] dark:border-[#30363d] dark:text-white dark:hover:border-emerald-500 text-xs font-bold transition"
                                >
                                  In
                                </button>
                                <button
                                  onClick={() => openModal('ADJUST', p)}
                                  className="px-3 py-1.5 rounded-lg bg-light-surface border border-slate-300 text-slate-800 hover:border-slate-500 dark:bg-[#1f2328] dark:border-[#30363d] dark:text-white dark:hover:border-[#8b949e] text-xs font-bold transition"
                                >
                                  Adjust
                                </button>
                                <button
                                  onClick={() => openModal('EDIT', p)}
                                  className="px-3 py-1.5 rounded-lg bg-light-surface border border-slate-300 text-slate-800 hover:border-slate-500 dark:bg-[#1f2328] dark:border-[#30363d] dark:text-white dark:hover:border-[#8b949e] text-xs font-bold transition"
                                >
                                  Edit
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination bar */}
              {productsData && productsData.last_page > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5 bg-light-muted dark:bg-[#121417] border-t border-slate-200 dark:border-[#1f2328] text-xs font-semibold text-slate-600 dark:text-[#8b949e]">
                  <span>Showing page {productsData.current_page} of {productsData.last_page} ({productsData.total} items)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(p - 1, 1))}
                      disabled={page === 1}
                      className="px-3.5 py-1.5 rounded-lg bg-light-surface border border-slate-300 dark:bg-[#1f2328] dark:border-[#30363d] text-slate-800 dark:text-white disabled:opacity-30"
                    >
                      Prev
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(p + 1, productsData.last_page))}
                      disabled={page === productsData.last_page}
                      className="px-3.5 py-1.5 rounded-lg bg-light-surface border border-slate-300 dark:bg-[#1f2328] dark:border-[#30363d] text-slate-800 dark:text-white disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB 2: AUDIT LOG ================= */}
        {activeTab === 'transactions' && (
          <div className="rounded-xl border border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#14161a] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-light-muted dark:bg-[#121417] text-slate-600 dark:text-[#8b949e] border-b border-slate-200 dark:border-[#1f2328] uppercase tracking-wider text-xs font-bold font-sans">
                  <tr>
                    <th className="py-3.5 px-4">TIMESTAMP</th>
                    <th className="py-3.5 px-4">TYPE</th>
                    <th className="py-3.5 px-4">ITEM</th>
                    <th className="py-3.5 px-4 text-center">QTY Δ</th>
                    <th className="py-3.5 px-4 text-right">UNIT COST/PRICE</th>
                    <th className="py-3.5 px-4 text-center">CASH IMPACT</th>
                    <th className="py-3.5 px-4">REFERENCE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#1f2328]">
                  {transactions?.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-500 dark:text-[#6e7681] font-sans text-sm">
                        No stock movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    transactions?.data.map((tx) => (
                      <tr key={tx.id} className="hover:bg-light-muted dark:hover:bg-[#181a1f]">
                        <td className="py-3 px-4 text-slate-500 dark:text-[#8b949e]">{tx.created_at}</td>
                        <td className="py-3 px-4 font-sans font-bold">
                          <span className={`px-2.5 py-1 rounded text-xs uppercase ${tx.type === 'IN' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                              tx.type === 'OUT_EXTERNAL' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500' :
                                tx.type === 'OUT_GARAGE' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-500'
                            }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-red-600 dark:text-red-500 font-bold">{tx.product?.item_code}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">{Number(tx.quantity)}</td>
                        <td className="py-3 px-4 text-right">{Number(tx.unit_price || tx.unit_cost).toFixed(2)} AED</td>
                        <td className="py-3 px-4 text-center">
                          {tx.affects_cash ? <span className="text-emerald-600 dark:text-emerald-400 font-bold">YES</span> : <span className="text-slate-400 dark:text-[#6e7681]">NO</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-[#8b949e] font-sans text-xs">{tx.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 3: CASH BOX LEDGER ================= */}
        {activeTab === 'cashbox' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Manual Cash Entry Card */}
            <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#14161a] p-6 shadow-sm space-y-4 h-fit">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Manual Cash Entry</h3>

              <form onSubmit={handleManualCash} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="block text-slate-600 dark:text-[#8b949e] mb-1.5">Type</label>
                  <select
                    value={manualType}
                    onChange={(e: any) => setManualType(e.target.value)}
                    className="w-full bg-light-muted dark:bg-[#1b1f24] border border-slate-300 dark:border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="INCOME">Income / Deposit (e.g. opening float)</option>
                    <option value="EXPENSE">Expense / Withdrawal (e.g. shop expenses)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-[#8b949e] mb-1.5">Amount (AED)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    placeholder="0.00"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    className="w-full bg-light-muted dark:bg-[#1b1f24] border border-slate-300 dark:border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white font-mono focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-[#8b949e] mb-1.5">Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Opening float or utility bill"
                    value={manualDesc}
                    onChange={(e) => setManualDesc(e.target.value)}
                    className="w-full bg-light-muted dark:bg-[#1b1f24] border border-slate-300 dark:border-[#30363d] rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#e52e2e] hover:bg-[#c92424] text-white py-3 rounded-lg text-sm font-bold transition shadow-sm"
                >
                  Record Entry
                </button>
              </form>
            </div>

            {/* Right Column: Cash Box History Table */}
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-[#1f2328] bg-light-surface dark:bg-[#14161a] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-mono">
                  <thead className="bg-light-muted dark:bg-[#121417] text-slate-600 dark:text-[#8b949e] border-b border-slate-200 dark:border-[#1f2328] uppercase tracking-wider text-xs font-bold font-sans">
                    <tr>
                      <th className="py-3.5 px-4">DATE</th>
                      <th className="py-3.5 px-4">TYPE</th>
                      <th className="py-3.5 px-4">SOURCE</th>
                      <th className="py-3.5 px-4">DESCRIPTION</th>
                      <th className="py-3.5 px-4 text-right">AMOUNT</th>
                      <th className="py-3.5 px-4 text-right">BALANCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-[#1f2328]">
                    {cashTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-500 dark:text-[#6e7681] font-sans text-sm">
                          No cash transactions yet — record an opening float to start.
                        </td>
                      </tr>
                    ) : (
                      cashTransactions.map((c) => (
                        <tr key={c.id} className="hover:bg-light-muted dark:hover:bg-[#181a1f]">
                          <td className="py-3 px-4 text-slate-500 dark:text-[#8b949e]">{c.created_at}</td>
                          <td className="py-3 px-4 font-sans font-bold">
                            <span className={c.transaction_type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'}>
                              {c.transaction_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-[#8b949e]">{c.source}</td>
                          <td className="py-3 px-4 font-sans text-slate-900 dark:text-white font-medium">{c.description}</td>
                          <td className={`py-3 px-4 text-right font-bold ${c.transaction_type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'}`}>
                            {c.transaction_type === 'INCOME' ? '+' : '-'}{Number(c.amount).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                            {Number(c.current_balance).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* 3. MODAL POPUP (Dark & Light Adaptive, Large Clear Fonts) */}
      {modalState.isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-[2px] p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-light-surface dark:bg-[#16181c] text-slate-900 dark:text-white border border-slate-200 dark:border-[#272b30] shadow-2xl overflow-hidden p-6 relative">

            {/* Modal Title & Close */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#262b32]">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {modalState.mode === 'ADD' && 'Add New Part'}
                {modalState.mode === 'EDIT' && 'Edit Part Details'}
                {modalState.mode === 'OUT' && 'Stock Out / Issue Part'}
                {modalState.mode === 'IN' && 'Stock In / Receive Inventory'}
                {modalState.mode === 'ADJUST' && 'Adjust Stock Quantity'}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4 pt-4 text-sm font-medium">

              {/* Case 1: ADD or EDIT */}
              {(modalState.mode === 'ADD' || modalState.mode === 'EDIT') && (
                <>
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Item code (SKU)</label>
                    <input
                      type="text"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      placeholder="e.g. VWR180001"
                      className="w-full rounded-lg border border-red-500/80 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] focus:outline-none focus:ring-1 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Product name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. RACINGLINE VWR Oil Cooler Replacement Filter"
                      className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] focus:outline-none focus:border-red-500"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] focus:outline-none focus:border-red-500"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Min stock alert</label>
                      <input
                        type="number"
                        min="0"
                        value={formMinAlert}
                        onChange={(e) => setFormMinAlert(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] font-mono focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Selling price (AED)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        placeholder="Optional"
                        value={formSellPrice}
                        onChange={(e) => setFormSellPrice(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] font-mono focus:outline-none focus:border-red-500"
                      />
                    </div>
                    {modalState.mode === 'ADD' && (
                      <div>
                        <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Opening quantity</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={formOpenQty}
                          onChange={(e) => setFormOpenQty(Number(e.target.value))}
                          className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] font-mono focus:outline-none focus:border-red-500"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {modalState.mode === 'ADD' && (
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Unit cost (AED)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formUnitCost}
                        onChange={(e) => setFormUnitCost(e.target.value)}
                        className="w-full max-w-[220px] rounded-lg border border-slate-300 dark:border-[#30363d] px-3 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227] font-mono focus:outline-none focus:border-red-500"
                        required
                      />
                    </div>
                  )}
                </>
              )}

              {/* Case 2: STOCK OUT */}
              {modalState.mode === 'OUT' && modalState.product && (
                <>
                  <div className="p-4 bg-light-muted dark:bg-[#1e2227] rounded-xl border border-slate-200 dark:border-[#2b3036]">
                    <div className="font-mono text-red-600 dark:text-red-500 font-bold text-base">{modalState.product.item_code}</div>
                    <div className="text-slate-800 dark:text-white font-semibold mt-0.5">{modalState.product.product_name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1.5">Available in Stock: <span className="font-bold text-emerald-600 dark:text-emerald-400">{Number(modalState.product.quantity)}</span></div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Stock Out Destination</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormOutType('OUT_EXTERNAL')}
                        className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${formOutType === 'OUT_EXTERNAL' ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-light-muted dark:bg-[#1e2227] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#30363d]'}`}
                      >
                        External Sale (+Cash)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormOutType('OUT_GARAGE')}
                        className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${formOutType === 'OUT_GARAGE' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm' : 'bg-light-muted dark:bg-[#1e2227] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#30363d]'}`}
                      >
                        Internal Garage Job
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Quantity</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        max={Number(modalState.product.quantity)}
                        value={formOpenQty}
                        onChange={(e) => setFormOpenQty(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Selling Price (AED)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formSellPrice}
                        onChange={(e) => setFormSellPrice(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Reference Notes (Car Plate / Invoice #)</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional reference"
                      className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                    />
                  </div>
                </>
              )}

              {/* Case 3: STOCK IN */}
              {modalState.mode === 'IN' && modalState.product && (
                <>
                  <div className="p-4 bg-light-muted dark:bg-[#1e2227] rounded-xl border border-slate-200 dark:border-[#2b3036]">
                    <div className="font-mono text-red-600 dark:text-red-500 font-bold text-base">{modalState.product.item_code}</div>
                    <div className="text-slate-800 dark:text-white font-semibold mt-0.5">{modalState.product.product_name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1.5">Current Avg Cost: <span className="font-bold text-slate-800 dark:text-white">{Number(modalState.product.purchase_cost).toFixed(2)} AED</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Incoming Quantity</label>
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        value={formOpenQty}
                        onChange={(e) => setFormOpenQty(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Unit Cost (AED)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={formUnitCost}
                        onChange={(e) => setFormUnitCost(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Supplier / Batch Reference</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Optional supplier reference"
                      className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                    />
                  </div>
                </>
              )}

              {/* Case 4: ADJUST */}
              {modalState.mode === 'ADJUST' && modalState.product && (
                <>
                  <div className="p-4 bg-light-muted dark:bg-[#1e2227] rounded-xl border border-slate-200 dark:border-[#2b3036]">
                    <div className="font-mono text-red-600 dark:text-red-500 font-bold text-base">{modalState.product.item_code}</div>
                    <div className="text-slate-800 dark:text-white font-semibold mt-0.5">{modalState.product.product_name}</div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1.5">Current System Count: <span className="font-bold text-slate-800 dark:text-white">{Number(modalState.product.quantity)}</span></div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Actual Physical Quantity</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={formOpenQty}
                      onChange={(e) => setFormOpenQty(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">Adjustment Reason (Audit Requirement)</label>
                    <input
                      type="text"
                      value={formReason}
                      onChange={(e) => setFormReason(e.target.value)}
                      placeholder="e.g. Physical count discrepancy, damaged item"
                      className="w-full rounded-lg border border-slate-300 dark:border-[#30363d] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white bg-light-muted dark:bg-[#1e2227]"
                      required
                    />
                  </div>
                </>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-[#262b32]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-[#30363d] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-light-muted dark:hover:bg-[#1e2227]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-lg bg-[#e52e2e] hover:bg-[#c92424] text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <div className="min-h-screen bg-light-canvas dark:bg-[#0c0d0e] flex items-center justify-center text-sm font-semibold text-slate-500 dark:text-[#8b949e]">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <InventoryApp />;
}