import { apiClient } from "./client";

export interface PaymentCreatePayload {
  installment_id: string;
  amount: number;
  currency: "USD" | "KHR";
  method: "cash" | "aba_bakong" | "bank_transfer" | "wing";
  reference_note?: string;
}

export interface PaymentItem {
  id: string;
  loan_id: string;
  installment_id: string;
  amount: number;
  currency: "USD" | "KHR";
  paid_at: string;
  method: string;
  exchange_rate_used?: number | null;
  client_name?: string;
  client_phone?: string;
  installment_number?: number;
  recorded_by_name?: string;
  loan_principal_currency?: string;
  amount_credited_to_loan?: number;
  remaining_balance?: number;
  receipt_number?: string;
}

export interface PaymentListResponse {
  items: PaymentItem[];
  total: number;
  page: number;
  page_size: number;
  total_usd: number;
  total_khr: number;
}

export interface DueInstallmentItem {
  installment_id: string;
  loan_id: string;
  client_id: string;
  client_name: string;
  client_phone?: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  late_fee_applied: number;
  net_due: number;
  currency: "USD" | "KHR";
  status: "upcoming" | "due" | "overdue" | "partial" | "paid";
  days_overdue: number;
  interest_rate: number;
}

export async function recordPayment(payload: PaymentCreatePayload): Promise<PaymentItem> {
  const { data } = await apiClient.post<PaymentItem>("/payments", payload);
  return data;
}

export async function listPayments(params?: {
  page?: number;
  page_size?: number;
  loan_id?: string;
  method?: string;
  currency?: string;
  search?: string;
}): Promise<PaymentListResponse> {
  const { data } = await apiClient.get<PaymentListResponse>("/payments", { params });
  return data;
}

export async function getDueInstallments(params?: {
  search?: string;
  status_filter?: string;
}): Promise<DueInstallmentItem[]> {
  const { data } = await apiClient.get<DueInstallmentItem[]>("/payments/due-installments", { params });
  return data;
}
