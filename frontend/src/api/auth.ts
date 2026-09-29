import { apiClient } from "./client";
import type { CurrentUser } from "./types";

export async function login(email: string, password: string): Promise<string> {
  const { data } = await apiClient.post("/auth/login", { email, password });
  return data.access_token as string;
}

export async function registerTenant(payload: {
  tenant_name: string;
  tenant_slug: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
}): Promise<string> {
  const { data } = await apiClient.post("/auth/register-tenant", payload);
  return data.access_token as string;
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await apiClient.get("/auth/me");
  return data as CurrentUser;
}
