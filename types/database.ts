export interface PaymentSetup {
  upi_id: string;
  payee_name: string;
  currency_code: string;
}

export interface SystemUser {
  name: string;
  pin: string;
}

export interface AutomationSettings {
  lastRouteReset: string;
  lastBillGeneration: string;
}

export interface Settings {
  payment: PaymentSetup;
  system_user: SystemUser;
  automation?: AutomationSettings;
  routes?: { names: string[] };
}

export interface InventoryItem {
  id: number;
  name: string;
  vol: string;
  count: number;
  unit: string;
  loaded: number;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  stock: number;
  price: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  area: string;
  frequency: string;
  status: 'Active' | 'Inactive';
  outstanding: number;
  created_at?: string;
}

export interface ActiveRouteStop {
  id: number;
  sequence: number;
  name: string;
  phone: string;
  qty: string;
  delivered: boolean;
  extras: Record<string, number>;
  inventory_deducted: boolean;
  shift: string;
  updated_at?: string;
}

export interface Bill {
  id: string;
  customer_name: string;
  phone: string;
  type: string;
  amount: number;
  status: 'Pending' | 'Paid' | string;
  date: string;
  date_label: string;
  qty: number;
  details: string;
  auto_generated: boolean;
  created_at?: string;
}
