export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  permissions: string[];
}

export interface Client {
  id: string;
  current_name: string;
  phone: string | null;
  national_id: string | null;
  address: string | null;
  email: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  category: string;
  name: string;
  price_amount: string;
  price_currency: string;
  is_active: boolean;
  created_at: string;
}

export type LoanStatus =
  | "pending_approval"
  | "active"
  | "closed"
  | "paid"
  | "rejected"
  | "overdue"
  | "defaulted"
  | "written_off"
  | "restructured";

export interface CollateralInfo {
  asset_type?: string;        // "land_hard_title" | "land_soft_title" | "vehicle" | "equipment" | "gold" | "other"
  description?: string;
  estimated_value?: number;
  forced_sale_value?: number;
  document_reference?: string;
}

export interface GuarantorInfo {
  name?: string;
  phone?: string;
  national_id?: string;
  relationship?: string;
  monthly_income?: number;
  address?: string;
}

export interface Loan {
  id: string;
  client_id: string;
  client_name?: string;
  product_id: string | null;
  product_name?: string;
  principal_amount: string;
  principal_currency: string;
  interest_rate_percent: string;
  interest_type: "flat" | "reducing";
  term_months: number;
  start_date: string;
  status: LoanStatus;
  grace_period_days: number;
  late_fee_percent: string;
  total_paid?: string;
  total_due?: string;
  outstanding_balance?: string;
  collateral_info?: CollateralInfo | null;
  guarantor_info?: GuarantorInfo | null;
  created_at: string;
  created_by_name?: string;
  decision_comment?: string | null;
}

export interface Installment {
  id: string;
  installment_number: number;
  due_date: string;
  amount_due: string;
  amount_paid: string;
  late_fee_applied: string;
  status: "upcoming" | "due" | "overdue" | "paid" | "waived";
}

export interface NotificationItem {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface SeriesPoint {
  bucket_start: string;
  value: string;
}

export interface SeriesResponse {
  metric: string;
  granularity: string;
  currency: string;
  points: SeriesPoint[];
}

export interface DashboardSummary {
  total_active_loans: number;
  total_disbursed: string;
  total_collected: string;
  pending_approvals: number;
  overdue_loans: number;
  total_clients: number;
  currency: string;
}

export interface ActivityLogEntry {
  id: string;
  actor_user_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  created_at: string;
}
