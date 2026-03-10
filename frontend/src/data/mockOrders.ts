import { Order, LogisticsStatus, LogisticsNode } from '@/types';

const ALL_STATUSES: LogisticsStatus[] = [
  'CREATED', 'PENDING_PAYMENT', 'PAID', 'READY_TO_SHIP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED',
];

function statusDescription(s: LogisticsStatus): string {
  const map: Record<LogisticsStatus, string> = {
    CREATED: 'Order has been created',
    PENDING_PAYMENT: 'Awaiting payment confirmation',
    PAID: 'Payment received successfully',
    READY_TO_SHIP: 'Package is ready for shipment',
    IN_TRANSIT: 'Package is on its way',
    OUT_FOR_DELIVERY: 'Package is out for delivery',
    DELIVERED: 'Package has been delivered',
  };
  return map[s];
}

function buildLogistics(upTo: number, baseDate: Date): LogisticsNode[] {
  return ALL_STATUSES.slice(0, upTo + 1).map((status, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    d.setHours(8 + i * 3, i * 15, 0, 0);
    return { status, timestamp: d.toISOString(), description: statusDescription(status) };
  });
}

function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

const productPool = [
  { name: 'Premium Headphones', cat: 'Electronics', store: 'NordStream Co.' },
  { name: 'Classic Sneakers', cat: 'Fashion', store: 'EuroStyle Hub' },
  { name: 'Modern Lamp', cat: 'Home & Living', store: 'Alpine Trading' },
  { name: 'Artisan Face Mask', cat: 'Beauty', store: 'Nova Retail' },
  { name: 'Yoga Mat Pro', cat: 'Sports', store: 'Pacific Goods' },
  { name: 'Signature Perfume', cat: 'Beauty', store: 'Urban Market' },
  { name: 'Essential Backpack', cat: 'Sports', store: 'NordStream Co.' },
  { name: 'Luxury Sunglasses', cat: 'Fashion', store: 'EuroStyle Hub' },
  { name: 'Minimal Vase', cat: 'Home & Living', store: 'Alpine Trading' },
  { name: 'Classic Novel', cat: 'Books', store: 'Nova Retail' },
];

export function getOrdersByClientId(clientId: string): Order[] {
  const seed = clientId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = seededRand(seed);
  const count = 2 + Math.floor(rand() * 3); // 2–4 orders
  const orders: Order[] = [];

  for (let o = 0; o < count; o++) {
    const baseDate = new Date('2025-01-01');
    baseDate.setDate(baseDate.getDate() + Math.floor(rand() * 40));

    const itemCount = 1 + Math.floor(rand() * 3);
    const items = [];
    let total = 0;

    for (let i = 0; i < itemCount; i++) {
      const p = productPool[Math.floor(rand() * productPool.length)];
      const qty = 1 + Math.floor(rand() * 3);
      const price = Math.round((rand() * 120 + 15) * 100) / 100;
      total += price * qty;
      items.push({
        productId: `p-${o}-${i}`,
        productName: p.name,
        productImage: `https://picsum.photos/seed/p-${o}-${i}/400/500`,
        category: p.cat,
        quantity: qty,
        unitPrice: price,
        storeName: p.store,
      });
    }

    const statusIdx = Math.min(Math.floor(rand() * 7), 6);
    orders.push({
      orderId: `ORD-${baseDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(o + 1).padStart(3, '0')}`,
      clientId,
      clientName: '',
      orderDate: baseDate.toISOString(),
      totalAmount: Math.round(total * 100) / 100,
      items,
      logistics: buildLogistics(statusIdx, baseDate),
      currentStatus: ALL_STATUSES[statusIdx],
    });
  }

  return orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
}

export function getOrderById(orderId: string, clientId: string): Order | undefined {
  return getOrdersByClientId(clientId).find((o) => o.orderId === orderId);
}
