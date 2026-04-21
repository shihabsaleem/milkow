export interface PaymentSetup {
  upi_id: string;
  payee_name: string;
  currency_code: string;
}

export interface SystemUser {
  name: string;
  pin: string;
}

export interface Settings {
  payment: PaymentSetup;
  system_user: SystemUser;
}

export interface InventoryItem {
  id?: string;
  name: string;
  vol: string;
  count: number;
  unit: string;
  loaded: number;
}

export interface Product {
  id?: string;
  name: string;
  size: string;
  stock: number;
  price: string;
}

export interface Customer {
  id: string | number;
  name: string;
  phone: string;
  area: string;
  frequency: string;
  status: 'Active' | 'Inactive';
  order?: string;
  outstanding?: string;
}

export interface PipelineStage {
  id?: string;
  label: string;
  value: string;
  unit: string;
}

export interface Bill {
  id: string;
  name: string;
  type: 'Weekly' | 'Monthly';
  amount: number;
  status: 'Pending' | 'Paid';
  date?: string;
}
