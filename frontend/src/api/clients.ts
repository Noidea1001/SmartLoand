import { apiClient } from "./client";
import type { Client, Paginated } from "./types";

export async function listClients(page = 1, search?: string): Promise<Paginated<Client>> {
  const { data } = await apiClient.get("/clients", { params: { page, search: search || undefined } });
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get(`/clients/${id}`);
  return data;
}

export async function createClient(payload: {
  current_name: string;
  phone?: string;
  national_id?: string;
  address?: string;
  email?: string;
}): Promise<Client> {
  const { data } = await apiClient.post("/clients", payload);
  return data;
}

export async function updateClient(id: string, payload: {
  current_name?: string;
  phone?: string;
  national_id?: string;
  address?: string;
  email?: string;
}): Promise<Client> {
  const { data } = await apiClient.patch(`/clients/${id}`, payload);
  return data;
}

export async function deleteClient(id: string): Promise<void> {
  await apiClient.delete(`/clients/${id}`);
}
