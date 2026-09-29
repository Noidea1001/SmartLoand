import { apiClient } from "./client";
import type { Paginated, Product } from "./types";

export async function listProducts(page = 1, search?: string): Promise<Paginated<Product>> {
  const { data } = await apiClient.get("/products", { params: { page, search: search || undefined } });
  return data;
}

export async function createProduct(payload: {
  category: string;
  name: string;
  price_amount: number;
  price_currency: string;
}): Promise<Product> {
  const { data } = await apiClient.post("/products", payload);
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  await apiClient.delete(`/products/${id}`);
}
