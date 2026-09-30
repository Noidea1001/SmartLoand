import { apiClient } from "./client";
import type { CollateralInfo, GuarantorInfo, Installment, Loan, Paginated } from "./types";

export async function listLoans(page = 1, status?: string): Promise<Paginated<Loan>> {
  const { data } = await apiClient.get("/loans", { params: { page, status } });
  return data;
}

export async function listPendingApprovals(page = 1): Promise<Paginated<Loan>> {
  const { data } = await apiClient.get("/loans/pending-approval", { params: { page } });
  return data;
}

export async function listMyRequests(page = 1): Promise<Paginated<Loan>> {
  const { data } = await apiClient.get("/loans/my-requests", { params: { page } });
  return data;
}

export async function getLoan(id: string): Promise<Loan> {
  const { data } = await apiClient.get(`/loans/${id}`);
  return data;
}

export async function getLoanInstallments(id: string): Promise<Installment[]> {
  const { data } = await apiClient.get(`/loans/${id}/installments`);
  return data;
}

export async function createLoan(payload: {
  client_id: string;
  product_id?: string;
  principal_amount: number;
  principal_currency: string;
  interest_rate_percent: number;
  interest_type: "flat" | "reducing";
  term_months: number;
  start_date: string;
  collateral_info?: CollateralInfo;
  guarantor_info?: GuarantorInfo;
}): Promise<Loan> {
  const { data } = await apiClient.post("/loans", payload);
  return data;
}

export async function decideLoan(id: string, approve: boolean, comments?: string): Promise<Loan> {
  const { data } = await apiClient.post(`/loans/${id}/decision`, { approve, comments });
  return data;
}

export interface PrepaymentPayload {
  amount: number;
  penalty_amount?: number;
  penalty_rate_percent?: number | null;
  waived?: boolean;
  waiver_reason?: string | null;
  notes?: string | null;
  is_full_payoff?: boolean;
}

export interface PayoffQuote {
  loan_id: string;
  client_name?: string | null;
  currency: string;
  original_principal: number;
  total_installments: number;
  paid_installments: number;
  remaining_installments: number;
  outstanding_balance: number;
  remaining_principal: number;
  accrued_interest: number;
  unearned_future_interest: number;
  default_penalty_rate_percent: number;
  suggested_penalty_amount: number;
  is_penalty_applicable: boolean;
  total_payoff_amount: number;
  total_savings_amount: number;
}

export async function prepayLoan(id: string, payload: number | PrepaymentPayload): Promise<Loan> {
  const body = typeof payload === "number" ? { amount: payload } : payload;
  const { data } = await apiClient.post(`/loans/${id}/prepay`, body);
  return data;
}

export async function getLoanPayoffQuote(id: string): Promise<PayoffQuote> {
  const { data } = await apiClient.get(`/loans/${id}/payoff-quote`);
  return data;
}

export async function restructureLoan(id: string, new_term_months: number, new_interest_rate_percent: number): Promise<Loan> {
  const { data } = await apiClient.post(`/loans/${id}/restructure`, { new_term_months, new_interest_rate_percent });
  return data;
}

export async function writeOffLoan(id: string, reason: string): Promise<Loan> {
  const { data } = await apiClient.post(`/loans/${id}/write-off`, { reason });
  return data;
}

export async function recordPayment(installment_id: string, amount: number, currency: string): Promise<void> {
  await apiClient.post("/payments", { installment_id, amount, currency });
}

export async function updateLoanSecurity(
  loanId: string,
  payload: { collateral_info?: CollateralInfo; guarantor_info?: GuarantorInfo },
): Promise<Loan> {
  const { data } = await apiClient.patch(`/loans/${loanId}/security`, payload);
  return data;
}

export async function getLoanReceipt(
  loanId: string,
  installmentNumber: number,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get(`/loans/${loanId}/receipt`, {
    params: { installment_number: installmentNumber },
  });
  return data;
}

export async function downloadLoanStatement(loanId: string): Promise<void> {
  const response = await apiClient.get(`/reports/loans/${loanId}/statement`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `loan-statement-${loanId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadLoanAgreement(loanId: string): Promise<void> {
  const response = await apiClient.get(`/reports/loans/${loanId}/agreement`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `loan-agreement-${loanId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

