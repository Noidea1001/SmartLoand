import { apiClient } from "./client";
import type { ActivityLogEntry } from "./types";

export interface ActivityLogResponse {
  items: ActivityLogEntry[];
  total: number;
  page: number;
  page_size: number;
  metrics?: {
    total_events: number;
    today_events: number;
    active_actors: number;
  };
}

export type TimeRangeOption = "all" | "day" | "week" | "month" | "year";

export async function listActivity(params: {
  page?: number;
  page_size?: number;
  entity_type?: string;
  time_range?: TimeRangeOption;
  q?: string;
} = {}): Promise<ActivityLogResponse> {
  const { data } = await apiClient.get<ActivityLogResponse>("/activity-log", { params });
  return data;
}

export async function exportActivityLogCsv(
  entity_type?: string,
  time_range?: TimeRangeOption
): Promise<Blob> {
  const { data } = await apiClient.get("/activity-log/export-csv", {
    params: { entity_type, time_range },
    responseType: "blob",
  });
  return data;
}
