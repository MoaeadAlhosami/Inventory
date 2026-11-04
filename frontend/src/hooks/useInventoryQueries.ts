import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type {
  CashBoxTransaction,
  Category,
  InventorySummary,
  PaginatedResponse,
  Product,
  StockTransaction,
} from '../types/inventory';

export interface ProductFilters {
  search: string;
  categoryId: string;
  lowStockOnly: boolean;
  page: number;
}

export interface TransactionFilters {
  search: string;
  page: number;
}

export interface CashboxData {
  currentBalance: number;
  transactions: CashBoxTransaction[];
}

export const queryKeys = {
  products: (filters: ProductFilters) => ['inventory', 'products', filters] as const,
  categories: ['inventory', 'categories'] as const,
  summary: ['inventory', 'summary'] as const,
  transactions: (filters: TransactionFilters) => ['inventory', 'transactions', filters] as const,
  cashbox: ['cashbox'] as const,
  qrScans: ['links', 'scans'] as const,
};

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: queryKeys.products(filters),
    queryFn: async (): Promise<PaginatedResponse<Product>> => {
      const { data } = await api.get('/inventory', {
        params: {
          search: filters.search,
          category_id: filters.categoryId,
          low_stock_only: filters.lowStockOnly,
          page: filters.page,
        },
      });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async (): Promise<Category[]> => (await api.get('/inventory/categories')).data,
    staleTime: 30 * 60 * 1000,
  });
}

export function useSummary() {
  return useQuery({
    queryKey: queryKeys.summary,
    queryFn: async (): Promise<InventorySummary> => (await api.get('/inventory/summary')).data,
  });
}

export function useTransactions(filters: TransactionFilters, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: async (): Promise<PaginatedResponse<StockTransaction>> => {
      const { data } = await api.get('/inventory/transactions', { params: filters });
      return data;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useQrScans() {
  return useQuery({
    queryKey: queryKeys.qrScans,
    queryFn: async (): Promise<number> => {
      const { data } = await api.get('/links/scans');
      return Number(data.scans) || 0;
    },
  });
}

export function useCashbox() {
  return useQuery({
    queryKey: queryKeys.cashbox,
    queryFn: async (): Promise<CashboxData> => {
      const { data } = await api.get('/cashbox');
      return {
        currentBalance: Number(data.current_balance) || 0,
        transactions: data.transactions?.data ?? data.transactions ?? [],
      };
    },
  });
}
