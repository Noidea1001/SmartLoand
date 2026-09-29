import { apiClient } from "./client";

export interface TenantSettings {
  base_currency: string;
  usd_to_khr_rate: string;
  rate_updated_at: string;
  default_interest_type: string;
  grace_period_days: number;
  late_fee_percent: string;
  locale: string;
}

export async function getSettings(): Promise<TenantSettings> {
  const { data } = await apiClient.get("/settings");
  return data;
}

export async function updateSettings(payload: Partial<{
  base_currency: string;
  usd_to_khr_rate: number;
  default_interest_type: string;
  grace_period_days: number;
  late_fee_percent: number;
  locale: string;
}>): Promise<TenantSettings> {
  const { data } = await apiClient.patch("/settings", payload);
  return data;
}
