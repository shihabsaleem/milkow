export interface PaymentSetup {
  upi_id: string;
  payee_name: string;
  currency_code: string;
}

export interface Admin {
  id: string;
  name: string;
  phone: string;
  pin_hash: string;
  created_at: string;
}

export interface AutomationSettings {
  lastRouteReset: string;
  lastBillGeneration: string;
  autoCloseEnabled?: boolean;
  morningCloseTime?: string;
  eveningCloseTime?: string;
}

export interface Settings {
  system_user?: {
    name: string;
    pin?: string;
  };
  payment?: PaymentSetup;
  [key: string]: any;
}

export interface InventoryItem {
  id: number;
  franchise_id?: string;
  name: string;
  vol: string;
  count: number;
  unit: string;
  loaded: number;
}

export interface Product {
  id: string;
  franchise_id?: string;
  name: string;
  size: string;
  stock: number;
  price: number;
  unit?: string;
}

export interface Customer {
  id: string;
  franchise_id?: string;
  name: string;
  phone: string;
  area_id: number;
  frequency: 'Morning Only' | 'Evening Only' | 'Morning & Evening';
  status: 'Active' | 'Inactive';
  delivery_order?: number;
  default_qty: number;
  default_product_id?: string | null;
  past_outstanding: number;
  created_at?: string;
}

export interface Delivery {
  id: string;
  customer_id: string;
  franchise_id?: string;
  delivery_date: string;
  shift: 'Morning Only' | 'Evening Only';
  product_id?: string | null;
  milk_qty: number;
  misc_items: any[];
  delivered: boolean;
  sequence_no: number;
  inventory_deducted: boolean;
  billed: boolean;
  created_at?: string;
}

export interface Bill {
  id: string;
  customer_id: string;
  franchise_id?: string;
  type: 'Weekly' | 'Monthly' | 'Spot' | 'Opening Balance';
  amount: number;
  status: 'Pending' | 'Paid';
  start_date?: string;
  end_date?: string;
  notes?: string;
  created_at: string;
}

export interface Area {
  id: number;
  franchise_id?: string;
  name: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Other';

export interface Payment {
  id: string;
  customer_id: string;
  franchise_id?: string;
  bill_id?: string | null;
  amount: number;
  method: PaymentMethod;
  payment_date: string;
  notes?: string;
  created_at: string;
}


export interface CustomerFinancials {
  id: string;
  name: string;
  past_outstanding: number;
  total_billed: number;
  total_paid: number;
  current_balance: number;
  account_status: 'Advance' | 'Credit';
}
