import apiClient from './client';

export interface CreateTransactionRequest {
  clientId: string | number;
  items: {
    productId: string | number;
    storeId: string | number;
    quantity: number;
    salesNetAmountEuro: number;
  }[];
  totalAmount: number;
  paymentMethod: string;
}

export interface CreateTransactionResponse {
  transactionIds: number[];
  status: string;
  createdAt: string;
}

export async function createTransaction(
  req: CreateTransactionRequest,
): Promise<CreateTransactionResponse> {
  const res = await apiClient.post('/api/v1/transactions', req);
  return res.data?.data;
}
