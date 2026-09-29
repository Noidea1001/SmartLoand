import { apiClient } from "./client";
import type { Installment, Loan, Paginated } from "./types";

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
}): Promise<Loan> {
  const { data } = await apiClient.post("/loans", payload);
  return data;
}

export async function decideLoan(id: string, approve: boolean, comments?: string): Promise<Loan> {
  const { data } = await apiClient.post(`/loans/${id}/decision`, { approve, comments });
  return data;
}

export async function prepayLoan(id: string, amount: number): Promise<Loan> {
  const { data } = await apiClient.post(`/loans/${id}/prepay`, { amount });
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
