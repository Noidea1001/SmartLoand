import { apiClient } from "./client";
import type { DashboardSummary, SeriesResponse } from "./types";

export async function getSeries(
  metric: "new_loans" | "collections" | "disbursed_amount",
  granularity: "week" | "month" | "year",
  currency: "USD" | "KHR"
): Promise<SeriesResponse> {
  const { data } = await apiClient.get("/dashboard/series", {
    params: { metric, granularity, currency },
  });
  return data;
}

export async function getDashboardSummary(currency: "USD" | "KHR" = "USD"): Promise<DashboardSummary> {
  const { data } = await apiClient.get("/dashboard/summary", { params: { currency } });
  return data;
}
