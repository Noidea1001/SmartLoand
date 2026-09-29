import { apiClient } from "./client";
import type { NotificationItem } from "./types";

export async function listNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const { data } = await apiClient.get("/notifications", { params: { unread_only: unreadOnly } });
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.post(`/notifications/${id}/read`);
}
