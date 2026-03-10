export interface User {
  id: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  avatar: string;
  country: string;
  segment?: string;
  totalPurchases?: number;
  totalSpendEuro?: number;
  avgOrderValue?: number;
  firstPurchaseDate?: string;
  lastPurchaseDate?: string;
  topCategories?: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  image: string;
  storeName: string;
  storeCountry: string;
  stockQuantity: number;
  stockCountry: string;
  rating: number;
  description: string;
  storeId?: string;
  // Enriched fields from backend
  universe?: string;
  familyLevel1?: string;
  familyLevel2?: string;
  sales7d?: number;
  sales30d?: number;
  totalSales?: number;
  totalQuantitySold?: number;
  totalRevenue?: number;
  uniqueBuyers?: number;
  stockCountries?: number;
  avgUnitPrice?: number;
  firstSaleDate?: string;
  lastSaleDate?: string;
  storeIds?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface RecommendationResponse {
  products: Product[];
  hasMore: boolean;
  page: number;
}

export type EventType =
  | 'product_impression'
  | 'product_click'
  | 'add_to_cart'
  | 'buy_now'
  | 'cart_click'
  | 'checkout_click';

export interface TrackingEvent {
  eventType: EventType;
  clientId: string;
  productId?: string;
  timestamp: string;
  sessionId?: string;
  page: string;
  position?: number;
  metadata?: Record<string, unknown>;
}

export type LogisticsStatus =
  | 'CREATED'
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'READY_TO_SHIP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED';

export interface LogisticsNode {
  status: LogisticsStatus;
  timestamp: string;
  description: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  quantity: number;
  unitPrice: number;
  storeName: string;
}

export interface Order {
  orderId: string;
  clientId: string;
  clientName: string;
  orderDate: string;
  totalAmount: number;
  items: OrderItem[];
  logistics: LogisticsNode[];
  currentStatus: LogisticsStatus;
}
