import { apiClient } from "./client";

export interface NbcTier {
  tier_id: string;
  name_km: string;
  name_en: string;
  days_range: string;
  days_range_km?: string;
  days_range_en?: string;
  provision_rate: number;
  count: number;
  gross_balance: number;
  provision_amount: number;
  color: string;
}

export interface NbcLoanItem {
  loan_id: string;
  client_name: string;
  client_phone?: string;
  principal_currency: string;
  principal_amount: number;
  converted_balance: number;
  days_overdue: number;
  tier_key: string;
  tier_name_km: string;
  tier_name_en: string;
  provision_rate: number;
  provision_amount: number;
  start_date: string;
  status: string;
}

export interface NbcComplianceResponse {
  as_of_date: string;
  currency: "USD" | "KHR";
  exchange_rate: number;
  summary: {
    total_active_loans: number;
    total_gross_balance: number;
    total_required_provision: number;
    npl_portfolio_amount: number;
    npl_ratio_percent: number;
  };
  tiers: NbcTier[];
  loans: NbcLoanItem[];
}

export interface CollateralItem {
  loan_id: string;
  loan_status: string;
  principal_amount: number;
  principal_currency: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
  client_national_id?: string;
  asset_type: "land_hard_title" | "land_soft_title" | "vehicle" | "equipment" | "gold" | "unsecured" | string;
  description: string;
  title_deed_no: string;
  location_details: string;
  estimated_value: number;
  forced_sale_value: number;
  valuation_currency: string;
  custody_location: string;
  custody_status: "in_vault" | "released" | "pledged" | string;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_relationship?: string;
  created_at?: string;
}

export interface CollateralVaultResponse {
  summary: {
    total_items: number;
    total_in_vault: number;
    total_released: number;
    total_market_value_usd: number;
    total_forced_sale_usd: number;
    total_market_value_khr: number;
  };
  collaterals: CollateralItem[];
}

export interface DueReminderItem {
  installment_id: string;
  installment_number: number;
  loan_id: string;
  due_date: string;
  days_diff: number;
  is_overdue: boolean;
  days_overdue: number;
  amount_due: number;
  currency: string;
  client_id?: string;
  client_name: string;
  client_phone?: string;
}

export interface RemindersResponse {
  as_of_date: string;
  total_queued: number;
  due_items: DueReminderItem[];
}

export async function getNbcComplianceReport(currency: "USD" | "KHR" = "USD"): Promise<NbcComplianceResponse> {
  const res = await apiClient.get<NbcComplianceResponse>("/reports/nbc-compliance", { params: { currency } });
  return res.data;
}

export async function getCollateralVaultReport(): Promise<CollateralVaultResponse> {
  const res = await apiClient.get<CollateralVaultResponse>("/reports/collateral-vault");
  return res.data;
}

export async function updateCollateralCustody(
  loanId: string,
  payload: { custody_location?: string; custody_status?: string; title_deed_no?: string }
): Promise<any> {
  const res = await apiClient.patch(`/reports/collateral/${loanId}/custody`, payload);
  return res.data;
}

export async function getRemindersDueList(daysAhead = 7): Promise<RemindersResponse> {
  const res = await apiClient.get<RemindersResponse>("/reports/reminders/due-list", { params: { days_ahead: daysAhead } });
  return res.data;
}

export async function sendPaymentReminder(payload: {
  installment_id: string;
  channel: "telegram" | "sms";
}): Promise<{
  ok: boolean;
  channel: string;
  dispatched_at: string;
  recipient: { name: string; phone: string };
  message_km: string;
  message_en: string;
  status: string;
}> {
  const res = await apiClient.post("/reports/reminders/send", payload);
  return res.data;
}

// 5. Cashier Daily Closing
export interface CashierPaymentItem {
  payment_id: string;
  loan_id: string;
  client_name: string;
  amount: number;
  currency: string;
  method: string;
  teller_name: string;
  paid_at: string;
}

export interface CashierDisbursementItem {
  loan_id: string;
  client_name: string;
  amount: number;
  currency: string;
}

export interface CashierSummaryResponse {
  report_date: string;
  summary: {
    cash_in_usd: number;
    cash_in_khr: number;
    non_cash_in_usd: number;
    non_cash_in_khr: number;
    disbursed_usd: number;
    disbursed_khr: number;
    total_transactions: number;
  };
  payments: CashierPaymentItem[];
  disbursements: CashierDisbursementItem[];
}

export async function getCashierDailySummary(targetDate?: string): Promise<CashierSummaryResponse> {
  const res = await apiClient.get<CashierSummaryResponse>("/reports/cashier/summary", {
    params: targetDate ? { target_date: targetDate } : {},
  });
  return res.data;
}

export async function submitCashierReconciliation(payload: {
  report_date: string;
  counted_usd: number;
  counted_khr: number;
  expected_usd: number;
  expected_khr: number;
  variance_usd: number;
  variance_khr: number;
  notes?: string;
}): Promise<{ ok: boolean; reconciled_at: string; voucher_id: string }> {
  const res = await apiClient.post("/reports/cashier/reconcile", payload);
  return res.data;
}

// 6. Officers Performance
export interface OfficerPerformanceItem {
  officer_id: string;
  name: string;
  email: string;
  total_originated_loans: number;
  active_loans_count: number;
  closed_loans_count: number;
  overdue_loans_count: number;
  portfolio_volume_usd: number;
  overdue_volume_usd: number;
  par_rate_percent: number;
  recovery_rate_percent: number;
  performance_score: number;
  tier: "excellent" | "good" | "needs_improvement";
}

export interface OfficersPerformanceResponse {
  as_of_date: string;
  total_officers: number;
  officers: OfficerPerformanceItem[];
}

export async function getOfficersPerformance(): Promise<OfficersPerformanceResponse> {
  const res = await apiClient.get<OfficersPerformanceResponse>("/reports/officers/performance");
  return res.data;
}

// 7. Guarantors Registry
export interface GuaranteedLoanItem {
  loan_id: string;
  borrower_name: string;
  borrower_phone?: string;
  principal_amount: number;
  currency: string;
  status: string;
  start_date: string;
  relationship: string;
}

export interface GuarantorItem {
  guarantor_name: string;
  phone: string;
  national_id?: string;
  relationships: string[];
  active_loans_count: number;
  total_loans_count: number;
  is_cross_guarantee: boolean;
  has_overdue_loan: boolean;
  risk_level: "high" | "medium" | "normal";
  total_exposure_usd: number;
  total_exposure_khr: number;
  guaranteed_loans: GuaranteedLoanItem[];
}

export interface GuarantorsRegistryResponse {
  as_of_date: string;
  summary: {
    total_guarantors: number;
    cross_guarantors_count: number;
    high_risk_guarantors_count: number;
  };
  guarantors: GuarantorItem[];
}

export async function getGuarantorRegistry(): Promise<GuarantorsRegistryResponse> {
  const res = await apiClient.get<GuarantorsRegistryResponse>("/reports/guarantors/registry");
  return res.data;
}

// 8. CBC Regulatory Export & Inquiry
export interface CbcRecordItem {
  loan_id?: string;
  client_id?: string;
  cbc_account_ref: string;
  national_id: string;
  borrower_name_km: string;
  borrower_name_en: string;
  date_of_birth: string;
  gender: string;
  phone_number: string;
  loan_purpose: string;
  contract_start_date: string;
  disbursed_amount: number;
  currency: string;
  term_months: number;
  days_past_due: number;
  cbc_status: string;
  loan_status: string;
  collateral_type: string;
}

export interface CbcExportResponse {
  as_of_date: string;
  total_records: number;
  reporting_institution: string;
  records: CbcRecordItem[];
}

export async function getCbcExport(): Promise<CbcExportResponse> {
  const res = await apiClient.get<CbcExportResponse>("/reports/cbc/export");
  return res.data;
}

export interface CbcInquiryResponse {
  client_id: string;
  client_name: string;
  national_id?: string;
  cbc_inquiry_reference: string;
  inquiry_date: string;
  cbc_score: number;
  cbc_grade: string;
  cbc_grade_km: string;
  status_label: "prime" | "moderate" | "delinquent";
  active_credit_facilities: number;
  historical_delinquencies_count: number;
  recommendation_km: string;
  recommendation_en: string;
}

export async function getCbcClientInquiry(clientId: string): Promise<CbcInquiryResponse> {
  const res = await apiClient.get<CbcInquiryResponse>(`/reports/cbc/inquiry/${clientId}`);
  return res.data;
}

// 9. Early Warning System (EWS)
export interface EwsItem {
  loan_id: string;
  borrower_name: string;
  borrower_phone: string;
  principal_amount: number;
  currency: string;
  days_overdue: number;
  risk_score: number;
  severity: "critical" | "high" | "medium";
  distress_signals_km: string[];
  distress_signals_en: string[];
  recommended_action_km: string;
  recommended_action_en: string;
  start_date: string;
  status: string;
}

export interface EwsResponse {
  as_of_date: string;
  summary: {
    total_watchlist: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
  };
  watchlist: EwsItem[];
}

export async function getEarlyWarningWatchlist(): Promise<EwsResponse> {
  const res = await apiClient.get<EwsResponse>("/reports/early-warning/watchlist");
  return res.data;
}

// 10. Documents Vault
export interface VaultDocItem {
  doc_id: string;
  loan_id: string;
  client_name: string;
  doc_type: "national_id" | "family_book" | "title_deed" | "loan_contract" | string;
  doc_title_km: string;
  doc_title_en: string;
  reference_number: string;
  status: "verified" | "pending_review" | "missing";
  uploaded_at: string;
  file_format: string;
}

export interface VaultDocsResponse {
  as_of_date: string;
  summary: {
    total_documents: number;
    verified_count: number;
    pending_count: number;
  };
  documents: VaultDocItem[];
}

export async function getDocumentsVault(): Promise<VaultDocsResponse> {
  const res = await apiClient.get<VaultDocsResponse>("/reports/documents/vault");
  return res.data;
}

// 11. Multi-Branch & Provincial Hierarchy
export interface BranchItem {
  branch_code: string;
  name_km: string;
  name_en: string;
  branch_manager: string;
  target_volume_usd: number;
  active_loans_count: number;
  total_loans_count: number;
  portfolio_volume_usd: number;
  overdue_volume_usd: number;
  par_rate_percent: number;
  target_achievement_percent: number;
  cash_drawer_limit_usd: number;
  status: "healthy" | "watch_required";
}

export interface BranchesResponse {
  as_of_date: string;
  total_branches: number;
  branches: BranchItem[];
}

export async function getBranchesSummary(): Promise<BranchesResponse> {
  const res = await apiClient.get<BranchesResponse>("/reports/branches/summary");
  return res.data;
}

export interface BranchCreatePayload {
  branch_code: string;
  name_km: string;
  name_en: string;
  branch_manager: string;
  target_volume_usd: number;
  cash_drawer_limit_usd?: number;
}

export interface BranchUpdatePayload {
  name_km?: string;
  name_en?: string;
  branch_manager?: string;
  target_volume_usd?: number;
  cash_drawer_limit_usd?: number;
}

export async function createBranch(payload: BranchCreatePayload): Promise<any> {
  const res = await apiClient.post("/reports/branches", payload);
  return res.data;
}

export async function updateBranch(code: string, payload: BranchUpdatePayload): Promise<any> {
  const res = await apiClient.put(`/reports/branches/${code}`, payload);
  return res.data;
}

export async function deleteBranch(code: string): Promise<any> {
  const res = await apiClient.delete(`/reports/branches/${code}`);
  return res.data;
}

// 12. Loan Restructuring Simulator
export interface RestructureSimulationResult {
  loan_id: string;
  borrower_name: string;
  principal_amount: number;
  currency: string;
  current_terms: {
    term_months: number;
    monthly_rate_percent: number;
    monthly_payment: number;
    total_interest: number;
    total_payable: number;
  };
  proposed_terms: {
    term_months: number;
    monthly_rate_percent: number;
    grace_period_months: number;
    monthly_payment_during_grace: number;
    monthly_regular_payment: number;
    total_interest: number;
    total_payable: number;
  };
  impact_analysis: {
    payment_reduction_amount: number;
    payment_relief_percent: number;
    borrower_cashflow_relief: "high" | "moderate" | "low";
    memo_reference: string;
    generated_at: string;
  };
}

export async function simulateLoanRestructuring(payload: {
  loan_id: string;
  new_term_months: number;
  new_rate_percent: number;
  grace_period_months: number;
}): Promise<RestructureSimulationResult> {
  const res = await apiClient.post<RestructureSimulationResult>("/reports/restructure/simulate", payload);
  return res.data;
}

// 13. Field Collection Sheet
export interface FieldCollectionItem {
  installment_id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  days_overdue: number;
  is_overdue: boolean;
  amount_due: number;
  currency: string;
  late_fee_applied: number;
  client_name: string;
  client_phone: string;
  location_details: string;
  branch_code: string;
  status: "due" | "overdue" | "paid";
}

export interface FieldCollectionResponse {
  as_of_date: string;
  summary: {
    total_borrowers_due: number;
    total_due_usd: number;
    total_due_khr: number;
    collected_today_usd: number;
    collected_today_khr: number;
  };
  collections: FieldCollectionItem[];
}

export async function getFieldCollectionSheet(params?: {
  collection_date?: string;
  branch_code?: string;
}): Promise<FieldCollectionResponse> {
  const res = await apiClient.get<FieldCollectionResponse>("/reports/field-collection", { params });
  return res.data;
}

export async function quickFieldCollection(payload: {
  loan_id: string;
  installment_id: string;
  amount: number;
  method?: string;
  notes?: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/field-collection/quick-collect", payload);
  return res.data;
}

// 14. End-of-Day EOD Batch Engine
export interface EodStatusResponse {
  today_date: string;
  last_run: {
    run_id: string;
    executed_at: string;
    date: string;
    executed_by: string;
    loans_evaluated: number;
    penalties_applied: number;
    total_penalty_usd: number;
    total_penalty_khr: number;
    reclassified_loans: number;
    status: string;
  } | null;
  active_loans_count: number;
  pending_penalties_count: number;
  estimated_penalties_usd: number;
  status: string;
}

export async function getEodStatus(): Promise<EodStatusResponse> {
  const res = await apiClient.get<EodStatusResponse>("/reports/eod/status");
  return res.data;
}

export async function runEodBatch(): Promise<any> {
  const res = await apiClient.post("/reports/eod/run");
  return res.data;
}

// 15. Anti-Stacking & Risk Watchlist
export interface WatchlistItem {
  id: string;
  client_id: string;
  client_name: string;
  national_id: string;
  phone: string;
  risk_type: string;
  risk_type_km: string;
  risk_type_en: string;
  severity: "high" | "medium" | "watch";
  details: string;
  active_loans_count: number;
  created_at: string;
  is_manual: boolean;
}

export interface WatchlistResponse {
  as_of_date: string;
  summary: {
    total_flagged: number;
    high_risk_count: number;
    medium_risk_count: number;
    manual_watchlist_count: number;
  };
  watchlist: WatchlistItem[];
}

export async function getRiskWatchlist(): Promise<WatchlistResponse> {
  const res = await apiClient.get<WatchlistResponse>("/reports/watchlist");
  return res.data;
}

export async function addToWatchlist(payload: {
  client_name: string;
  client_id?: string;
  national_id?: string;
  phone?: string;
  severity: "high" | "medium" | "watch";
  reason: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/watchlist", payload);
  return res.data;
}

export async function removeFromWatchlist(itemId: string): Promise<any> {
  const res = await apiClient.delete(`/reports/watchlist/${itemId}`);
  return res.data;
}

// 16. NBC Loan Loss Provisioning
export async function downloadNbcProvisioningCsv(currency: "USD" | "KHR" = "USD"): Promise<Blob> {
  const res = await apiClient.get(`/reports/nbc/export-csv?currency=${currency}`, {
    responseType: "blob",
  });
  return res.data;
}

// 17. Loan Write-Off & Bad Debt Recovery Tracker
export interface WriteOffRecoveryItem {
  receipt_no: string;
  amount: number;
  currency: string;
  date: string;
  officer: string;
  notes: string;
}

export interface WriteOffItem {
  id: string;
  loan_id?: string | null;
  client_name: string;
  client_phone?: string;
  written_off_principal: number;
  written_off_interest: number;
  currency: string;
  write_off_date: string;
  approval_reference: string;
  recovery_officer: string;
  reason: string;
  status: "pending_recovery" | "partial_recovered" | "fully_recovered";
  total_recovered: number;
  remaining_unrecovered: number;
  recovery_history: WriteOffRecoveryItem[];
}

export interface WriteOffsResponse {
  summary: {
    total_written_off_usd: number;
    total_written_off_khr: number;
    total_recovered_usd: number;
    total_recovered_khr: number;
    recovery_rate_pct: number;
    total_cases: number;
    partial_count: number;
    fully_recovered_count: number;
  };
  records: WriteOffItem[];
}

export async function getWriteOffsTracker(): Promise<WriteOffsResponse> {
  const res = await apiClient.get<WriteOffsResponse>("/reports/writeoffs");
  return res.data;
}

export async function createLoanWriteOff(payload: {
  client_name: string;
  loan_id?: string;
  client_phone?: string;
  principal: number;
  interest: number;
  currency: string;
  reason: string;
  approval_reference?: string;
  recovery_officer?: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/writeoffs", payload);
  return res.data;
}

export async function recordWriteOffRecovery(
  itemId: string,
  payload: {
    amount: number;
    receipt_no?: string;
    date?: string;
    officer?: string;
    notes?: string;
  }
): Promise<any> {
  const res = await apiClient.post(`/reports/writeoffs/${itemId}/recover`, payload);
  return res.data;
}

// 18. Dual-Currency FX Exchange & Petty Cash
export interface FxConversion {
  id: string;
  client_name: string;
  from_currency: string;
  to_currency: string;
  amount_in: number;
  amount_out: number;
  rate: number;
  spread_gain_usd: number;
  created_at: string;
  officer: string;
}

export interface PettyCashLog {
  id: string;
  type: string;
  currency: string;
  amount: number;
  reason: string;
  officer: string;
  date: string;
}

export interface FxSummaryResponse {
  rates: {
    nbc_rate: number;
    branch_buy_rate: number;
    branch_sell_rate: number;
    last_updated: string;
  };
  drawer: {
    usd_balance: number;
    khr_balance: number;
    vault_limit_usd: number;
    vault_limit_khr: number;
  };
  conversions: FxConversion[];
  drawer_logs: PettyCashLog[];
}

export async function getFxSummary(): Promise<FxSummaryResponse> {
  const res = await apiClient.get<FxSummaryResponse>("/reports/fx/summary");
  return res.data;
}

export async function convertCurrency(payload: {
  from_currency: string;
  to_currency: string;
  amount_in: number;
  rate?: number;
  client_name?: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/fx/convert", payload);
  return res.data;
}

export async function managePettyCash(payload: {
  type: "replenishment" | "withdrawal";
  currency: "USD" | "KHR";
  amount: number;
  reason: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/fx/petty-cash", payload);
  return res.data;
}

// 19. Morning Telegram Bot Dispatcher
export interface TelegramDispatchLog {
  id: string;
  dispatched_at: string;
  chat_id: string;
  status: string;
  recipient: string;
  content_summary: string;
}

export interface TelegramConfigResponse {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
  briefing_time: string;
  notify_delinquency: boolean;
  notify_approvals: boolean;
  notify_eod: boolean;
  dispatch_logs: TelegramDispatchLog[];
}

export async function getTelegramConfig(): Promise<TelegramConfigResponse> {
  const res = await apiClient.get<TelegramConfigResponse>("/reports/telegram/config");
  return res.data;
}

export async function saveTelegramConfig(payload: Partial<TelegramConfigResponse>): Promise<any> {
  const res = await apiClient.post("/reports/telegram/config", payload);
  return res.data;
}

export async function dispatchTelegramBriefing(): Promise<{
  ok: boolean;
  status: string;
  dispatched_at: string;
  message_preview: string;
}> {
  const res = await apiClient.post("/reports/telegram/dispatch");
  return res.data;
}

// 20. Online QR Loan Intake & Leads Management
export interface LoanLeadItem {
  id: string;
  full_name: string;
  phone: string;
  national_id?: string;
  requested_amount: number;
  currency: string;
  loan_purpose: string;
  monthly_income?: string;
  employment_status?: string;
  province?: string;
  collateral_type?: string;
  status: "new" | "contacted" | "under_review" | "converted" | "rejected";
  assigned_officer?: string;
  notes?: string;
  created_at: string;
}

export interface LeadsResponse {
  summary: {
    total_leads: number;
    new_count: number;
    contacted_count: number;
    under_review_count: number;
    converted_count: number;
    rejected_count: number;
  };
  leads: LoanLeadItem[];
}

export async function submitPublicLoanLead(payload: {
  full_name: string;
  phone: string;
  national_id?: string;
  requested_amount: number;
  currency: string;
  loan_purpose: string;
  monthly_income?: string;
  employment_status?: string;
  province?: string;
  collateral_type?: string;
  notes?: string;
}): Promise<{ ok: boolean; reference_code: string; message: string }> {
  const res = await apiClient.post("/reports/leads/public-apply", payload);
  return res.data;
}

export async function getLoanIntakeLeads(): Promise<LeadsResponse> {
  const res = await apiClient.get<LeadsResponse>("/reports/leads");
  return res.data;
}

export async function updateLeadStatus(
  leadId: string,
  payload: {
    status?: string;
    assigned_officer?: string;
    notes?: string;
  }
): Promise<any> {
  const res = await apiClient.patch(`/reports/leads/${leadId}`, payload);
  return res.data;
}

// =========================================================================
// 21. Bakong KHQR Real-Time Payment Webhook & Reconciliation
// =========================================================================

export interface BakongTransaction {
  id: string;
  hash: string;
  md5: string;
  payer_name: string;
  payer_bank: string;
  payer_account: string;
  receiver_account: string;
  amount: number;
  currency: "USD" | "KHR";
  bill_number: string;
  status: "settled" | "pending_match" | "unmatched_float";
  matched_loan_id: string | null;
  reconciled_at: string | null;
  created_at: string;
}

export interface BakongTransactionsResponse {
  summary: {
    total_transactions: number;
    settled_count: number;
    pending_count: number;
    unmatched_count: number;
    auto_match_rate_pct: number;
    settled_usd: number;
    settled_khr: number;
  };
  transactions: BakongTransaction[];
}

export async function getBakongTransactions(): Promise<BakongTransactionsResponse> {
  const res = await apiClient.get<BakongTransactionsResponse>("/reports/bakong/transactions");
  return res.data;
}

export async function simulateBakongWebhook(payload: {
  payer_name: string;
  payer_bank: string;
  amount: number;
  currency: string;
  bill_number: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/bakong/webhook", payload);
  return res.data;
}

export async function manualReconcileBakong(payload: {
  transaction_id: string;
  target_loan_id: string;
}): Promise<any> {
  const res = await apiClient.post("/reports/bakong/reconcile-manual", payload);
  return res.data;
}

// =========================================================================
// 22. Automated Credit Underwriting & 5Cs Scoring Matrix
// =========================================================================

export interface CreditScoreEvaluation {
  id: string;
  borrower_name: string;
  national_id: string;
  phone: string;
  requested_amount: number;
  currency: "USD" | "KHR";
  monthly_income: number;
  monthly_expenses: number;
  monthly_debt_repayment: number;
  proposed_monthly_installment: number;
  collateral_value: number;
  collateral_type: string;
  cbc_status: string;
  scores: {
    character: number;
    capacity: number;
    capital: number;
    collateral: number;
    conditions: number;
    overall_score: number;
  };
  metrics: {
    dscr: number;
    dti_pct: number;
    ltv_pct: number;
  };
  risk_tier: "A+" | "A" | "B" | "C" | "D";
  recommendation: "AUTO_APPROVE" | "COMMITTEE_REVIEW" | "DECLINE";
  max_approved_limit: number;
  evaluated_by: string;
  created_at: string;
}

export interface CreditScoringResponse {
  summary: {
    total_evaluations: number;
    auto_approved_count: number;
    committee_review_count: number;
    declined_count: number;
    average_score: number;
  };
  evaluations: CreditScoreEvaluation[];
}

export async function getCreditScoringEvaluations(): Promise<CreditScoringResponse> {
  const res = await apiClient.get<CreditScoringResponse>("/reports/credit-scoring/evaluations");
  return res.data;
}

export async function submitCreditUnderwritingEvaluation(payload: {
  borrower_name: string;
  national_id?: string;
  phone?: string;
  requested_amount: number;
  currency: string;
  monthly_income: number;
  monthly_expenses: number;
  monthly_debt_repayment: number;
  proposed_monthly_installment: number;
  collateral_value: number;
  collateral_type: string;
  cbc_status: string;
}): Promise<{ ok: boolean; evaluation: CreditScoreEvaluation }> {
  const res = await apiClient.post("/reports/credit-scoring/evaluate", payload);
  return res.data;
}

// =========================================================================
// 23. General Ledger (GL) & Double-Entry Accounting Module
// =========================================================================

export interface AccountItem {
  code: string;
  name_km: string;
  name_en: string;
  category: "asset" | "liability" | "equity" | "revenue" | "expense" | "contra_asset";
  debit_usd: number;
  credit_usd: number;
  debit_khr: number;
  credit_khr: number;
}

export interface JournalVoucherLine {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface JournalVoucher {
  voucher_no: string;
  date: string;
  description_km: string;
  description_en: string;
  branch: string;
  currency: "USD" | "KHR";
  total_amount: number;
  lines: JournalVoucherLine[];
}

export interface TrialBalanceResponse {
  as_of_date: string;
  usd: {
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
    variance: number;
  };
  khr: {
    total_debit: number;
    total_credit: number;
    is_balanced: boolean;
    variance: number;
  };
  accounts: AccountItem[];
}

export async function getChartOfAccounts(): Promise<{ chart_of_accounts: AccountItem[] }> {
  const res = await apiClient.get("/reports/accounting/chart-of-accounts");
  return res.data;
}

export async function getJournalEntries(): Promise<{ journal_entries: JournalVoucher[] }> {
  const res = await apiClient.get("/reports/accounting/journal-entries");
  return res.data;
}

export async function getTrialBalance(): Promise<TrialBalanceResponse> {
  const res = await apiClient.get<TrialBalanceResponse>("/reports/accounting/trial-balance");
  return res.data;
}

export async function postJournalEntry(payload: {
  description_km: string;
  description_en: string;
  branch?: string;
  currency: string;
  lines: JournalVoucherLine[];
}): Promise<any> {
  const res = await apiClient.post("/reports/accounting/journal-entries", payload);
  return res.data;
}
