import { apiClient } from "./client";

export interface Permission {
  id: string;
  code: string;
  module: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  is_system_default: boolean;
  permission_codes: string[];
}

export async function listPermissions(): Promise<Permission[]> {
  const { data } = await apiClient.get("/roles/permissions");
  return data;
}

export async function listRoles(): Promise<Role[]> {
  const { data } = await apiClient.get("/roles");
  return data;
}

export async function createRole(name: string, permission_codes: string[]): Promise<Role> {
  const { data } = await apiClient.post("/roles", { name, permission_codes });
  return data;
}

export async function updateRole(id: string, name: string, permission_codes: string[]): Promise<Role> {
  const { data } = await apiClient.patch(`/roles/${id}`, { name, permission_codes });
  return data;
}

export async function deleteRole(id: string): Promise<void> {
  await apiClient.delete(`/roles/${id}`);
}
