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
  created_at: string;
}

export interface Product {
  id: string;
  category: string;
  name: string;
  price_amount: string;
  price_currency: string;
  created_at: string;
}

export type LoanStatus =
  | "pending_approval"
  | "active"
  | "closed"
  | "rejected"
  | "overdue"
  | "defaulted"
  | "written_off"
  | "restructured";

export interface Loan {
  id: string;
  client_id: string;
  product_id: string | null;
  principal_amount: string;
  principal_currency: string;
  interest_rate_percent: string;
  interest_type: "flat" | "reducing";
  term_months: number;
  start_date: string;
  status: LoanStatus;
  grace_period_days: number;
  late_fee_percent: string;
  created_at: string;
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

export interface ActivityLogEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}
