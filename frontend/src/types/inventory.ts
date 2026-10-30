export interface Category {
    id: number;
    name: string;
}

export interface Product {
    id: number;
    category_id: number;
    item_code: string;
    product_name: string;
    quantity: string | number;
    purchase_cost: string | number;
    selling_price: string | number | null;
    min_stock_level: number;
    is_active: boolean;
    category?: Category;
    created_at?: string;
    updated_at?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

export interface InventorySummary {
    total_items: number;
    total_quantity: number;
    total_cost_value: number;
    total_selling_value: number;
    low_stock_count: number;
}

export interface StockTransaction {
    id: number;
    product_id: number;
    type: 'IN' | 'OUT_EXTERNAL' | 'OUT_GARAGE' | 'ADJUSTMENT';
    quantity: string | number;
    unit_cost: string | number;
    unit_price: string | number;
    affects_cash: boolean;
    notes: string | null;
    created_at: string;
    product?: Product;
}

export interface CashBoxTransaction {
    id: number;
    transaction_type: 'INCOME' | 'EXPENSE';
    amount: string | number;
    source: 'EXTERNAL_SALE' | 'GARAGE_JOB' | 'PURCHASE' | 'MANUAL_DEPOSIT' | 'MANUAL_WITHDRAW';
    stock_transaction_id: number | null;
    description: string;
    current_balance: string | number;
    created_at: string;
    stock_transaction?: StockTransaction;
}