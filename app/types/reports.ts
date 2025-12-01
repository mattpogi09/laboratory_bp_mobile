export type Period = "day" | "week" | "month" | "year";

export type FinancialRow = {
  id: number;
  date: string;
  patient: string;
  tests: string;
  amount: number;
  discount_amount: number;
  discount_name: string | null;
  net_amount: number;
  payment_method: string;
  payment_status: string;
};

export type InventoryLogRow = {
  id: number;
  date: string;
  transaction_code: string;
  item: string;
  type: string;
  quantity: number;
  previous_stock: number | null;
  new_stock: number | null;
  reason: string;
  performed_by: string;
};

export type AuditLogRow = {
  id: number;
  timestamp: string;
  user: string;
  user_role: string | null;
  action: string;
  action_category: string;
  details: string;
  severity: string;
};

export type LabReportRow = {
  id: number;
  date: string;
  transaction_number: string;
  patient: string;
  test_name: string;
  performed_by: string;
  status: string;
};

export type ReconciliationRow = {
  id: number;
  date: string;
  cashier: string;
  expected_cash: number;
  actual_cash: number;
  variance: number;
  status: "balanced" | "overage" | "shortage";
  transaction_count: number;
};

export type FinancialData = {
  rows: FinancialRow[];
  totals: {
    revenue: number;
    discounts: number;
    transactions: number;
  };
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type InventoryData = {
  data: InventoryLogRow[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AuditData = {
  data: AuditLogRow[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type LabReportData = {
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    released: number;
  };
  rows: LabReportRow[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type ReconciliationData = {
  stats: {
    total: number;
    balanced: number;
    overage: number;
    shortage: number;
    total_overage_amount: number;
    total_shortage_amount: number;
  };
  rows: ReconciliationRow[];
};
