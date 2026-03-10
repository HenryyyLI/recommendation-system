import apiClient from './client';

export interface BackendClient {
  ClientID: number;
  ClientSegment: string;
  ClientCountry: string;
  ClientGender: string;
  Age: number;
  TotalPurchases: number;
  TotalSpendEuro: number;
  AvgOrderValue: number;
  FirstPurchaseDate: string;
  LastPurchaseDate: string;
  TopCategory1: string;
  TopCategory2: string;
  TopCategory3: string;
}

export async function fetchClientInfo(clientId: string): Promise<BackendClient> {
  const res = await apiClient.get(`/api/v1/clients/${clientId}`);
  return res.data?.data;
}

/**
 * Fetch random clients from the backend.
 * Falls back to empty array if the endpoint doesn't exist.
 */
export async function fetchRandomClients(limit = 10): Promise<BackendClient[]> {
  try {
    const res = await apiClient.get('/api/v1/clients/random', { params: { limit } });
    return res.data?.data || [];
  } catch {
    return [];
  }
}
