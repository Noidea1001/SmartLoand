import { apiClient } from "./client";
import type { ActivityLogEntry, Paginated } from "./types";

export async function listActivity(page = 1): Promise<Paginated<ActivityLogEntry>> {
  const { data } = await apiClient.get("/activity-log", { params: { page } });
  return data;
}
