import apiClient from './client';
import { mapBackendOrderItem } from './mappers';
import { Order, LogisticsStatus, LogisticsNode } from '@/types';
import { getOrderById } from '@/data/mockOrders';

const ALL_STATUSES: LogisticsStatus[] = [
  'CREATED', 'PENDING_PAYMENT', 'PAID', 'READY_TO_SHIP',
  'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

const STATUS_DESC: Record<LogisticsStatus, string> = {
  CREATED: 'Order has been created',
  PENDING_PAYMENT: 'Awaiting payment confirmation',
  PAID: 'Payment received successfully',
  READY_TO_SHIP: 'Package is ready for shipment',
  IN_TRANSIT: 'Package is on its way',
  OUT_FOR_DELIVERY: 'Package is out for delivery',
  DELIVERED: 'Package has been delivered',
};

function generateLogistics(status: LogisticsStatus, orderDate: string): LogisticsNode[] {
  const idx = ALL_STATUSES.indexOf(status);
  if (idx < 0) return [];
  const base = new Date(orderDate);
  return ALL_STATUSES.slice(0, idx + 1).map((s, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    d.setHours(8 + i * 3, i * 15, 0, 0);
    return { status: s, timestamp: d.toISOString(), description: STATUS_DESC[s] };
  });
}

export interface OrderSummary {
  orderId: string;
  orderDate: string;
  totalAmount: number;
  status: LogisticsStatus;
  itemCount: number;
}

export async function fetchOrders(
  clientId: string,
  page = 0,
  pageSize = 20,
): Promise<{ orders: OrderSummary[]; hasMore: boolean; page: number }> {
  try {
    const res = await apiClient.get('/api/v1/orders', {
      params: { clientId: clientId, page, pageSize },
    });
    const data = res.data?.data;
    return {
      orders: (data?.orders || []).map((o: Record<string, unknown>) => ({
        ...o,
        orderId: String(o.orderId),
      })) as OrderSummary[],
      hasMore: data?.hasMore ?? false,
      page: data?.page ?? page,
    };
  } catch (error) {
    console.warn('[API] Orders list failed, falling back to mock:', error);
    // Fallback to mock data
    const { getOrdersByClientId } = await import('@/data/mockOrders');
    const mockOrders = getOrdersByClientId(clientId);
    const start = page * pageSize;
    const slice = mockOrders.slice(start, start + pageSize);
    return {
      orders: slice.map((o) => ({
        orderId: o.orderId,
        orderDate: o.orderDate,
        totalAmount: o.totalAmount,
        status: o.currentStatus,
        itemCount: o.items.length,
      })),
      hasMore: start + pageSize < mockOrders.length,
      page,
    };
  }
}

export async function fetchOrderDetail(orderId: string, clientId?: string): Promise<Order | null> {
  try {
    const res = await apiClient.get(`/api/v1/orders/${orderId}`, {
      params: clientId ? { clientId } : undefined,
    });
    const data = res.data?.data;
    if (!data) return null;

    const status = (data.status as LogisticsStatus) || 'CREATED';
    // Use backend logistics if available, otherwise generate client-side
    const backendLogistics = data.logistics as LogisticsNode[] | undefined;

    return {
      orderId: String(data.orderId),
      clientId: String(data.clientId),
      clientName: data.clientName || '',
      orderDate: data.orderDate || '',
      totalAmount: data.totalAmount || 0,
      items: (data.items || []).map(mapBackendOrderItem),
      logistics: backendLogistics && backendLogistics.length > 0
        ? backendLogistics
        : generateLogistics(status, data.orderDate),
      currentStatus: status,
    };
  } catch (error) {
    console.warn('[API] Order detail failed, falling back to mock:', error);
    // Fallback to mock data
    if (clientId) {
      const mock = getOrderById(orderId, clientId);
      if (mock) return mock;
    }
    return null;
  }
}
