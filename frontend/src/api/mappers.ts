import { Product, OrderItem } from '@/types';

/**
 * Global image cache: productId → imageURL
 * Once a product gets an image URL (from backend or fallback), it never changes.
 */
const imageCache = new Map<string, string>();

export function getCachedImage(productId: string): string | undefined {
  return imageCache.get(productId);
}

export function clearImageCache(): void {
  imageCache.clear();
}

export function setCachedImage(productId: string, url: string): void {
  imageCache.set(productId, url);
}

const STORE_NAME_POOL = [
  'Global Direct', 'NordStream Co.', 'EuroStyle Hub', 'Pacific Goods',
  'Alpine Trading', 'Urban Market', 'Nova Retail', 'Luxe Boutique',
  'Prime Select', 'Stellar Shop', 'Metro Goods', 'Atlas Commerce',
  'Zenith Store', 'Vanguard Retail', 'Crest Supply', 'Summit Goods',
];

const STORE_COUNTRY_POOL = ['US', 'FR', 'AU', 'CH', 'UK', 'CA', 'DE', 'IT', 'JP', 'ES'];

/** String-safe hash for large IDs (BigInt-safe) */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getStoreNameById(storeId: number | string): string {
  return STORE_NAME_POOL[hashString(String(storeId)) % STORE_NAME_POOL.length];
}

export function getStoreCountryById(storeId: number | string): string {
  return STORE_COUNTRY_POOL[hashString(String(storeId)) % STORE_COUNTRY_POOL.length];
}

export function getProductImageById(productId: number | string): string {
  return `https://picsum.photos/seed/p-${productId}/400/500`;
}

export function generateProductName(
  productId: number | string,
  familyLevel1?: string,
  familyLevel2?: string,
): string {
  if (familyLevel1 && familyLevel2 && familyLevel1 !== familyLevel2) {
    return `${familyLevel1} ${familyLevel2}`;
  }
  return familyLevel2 || familyLevel1 || `Product #${productId}`;
}

export function mapBackendProduct(raw: Record<string, unknown>): Product {
  const storeIds = (raw.StoreIDs as (number | string)[]) || [];
  const pid = String(raw.ProductID);
  // Pick a varied storeId per product using productId hash (not always the first)
  const storeId = storeIds.length > 0
    ? storeIds[hashString(pid) % storeIds.length]
    : undefined;
  const storeIdStr = storeId != null ? String(storeId) : '0';

  // Check global image cache first — same product always gets same image
  const cached = getCachedImage(pid);
  let imageUrl: string;
  if (cached) {
    imageUrl = cached;
  } else {
    const backendImage = raw.ImageURL as string | undefined;
    imageUrl = backendImage || getProductImageById(pid);
    setCachedImage(pid, imageUrl);
  }

  return {
    id: pid,
    name: generateProductName(
      pid,
      raw.FamilyLevel1 as string | undefined,
      raw.FamilyLevel2 as string | undefined,
    ),
    category: (raw.Category as string) || 'Other',
    subcategory: (raw.FamilyLevel2 as string) || (raw.FamilyLevel1 as string) || '',
    price: (raw.AvgPrice as number) || 0,
    image: imageUrl,
    storeName: getStoreNameById(storeIdStr),
    storeCountry: (raw.StoreCountry as string) || getStoreCountryById(storeIdStr),
    stockQuantity: (raw.TotalStockQuantity as number) || 0,
    stockCountry: (raw.StoreCountry as string) || '',
    rating: (raw.Rating as number) ?? 0,
    description: `Discover our ${((raw.FamilyLevel2 as string) || (raw.FamilyLevel1 as string) || (raw.Category as string) || 'product').toLowerCase()} — crafted with care and designed for everyday elegance.`,
    storeId: storeIdStr,
    // Enriched fields
    universe: (raw.Universe as string) || undefined,
    familyLevel1: (raw.FamilyLevel1 as string) || undefined,
    familyLevel2: (raw.FamilyLevel2 as string) || undefined,
    sales7d: (raw.Sales7d as number) || 0,
    sales30d: (raw.Sales30d as number) || 0,
    totalSales: (raw.TotalSales as number) || 0,
    totalQuantitySold: (raw.TotalQuantitySold as number) || 0,
    totalRevenue: (raw.TotalRevenue as number) || 0,
    uniqueBuyers: (raw.UniqueBuyers as number) || 0,
    stockCountries: (raw.StockCountries as number) || 0,
    avgUnitPrice: (raw.AvgUnitPrice as number) || 0,
    firstSaleDate: (raw.FirstSaleDate as string) || undefined,
    lastSaleDate: (raw.LastSaleDate as string) || undefined,
    storeIds: storeIds.map(String),
  };
}

export function mapBackendOrderItem(raw: Record<string, unknown>): OrderItem {
  const pid = String(raw.productId);
  const sid = raw.storeId != null ? String(raw.storeId) : '0';

  // Use backend-provided image/name/storeName if available
  const backendImage = raw.productImage as string | undefined;
  const image = backendImage || getProductImageById(pid);

  const backendName = raw.productName as string | undefined;
  const name = backendName || generateProductName(pid, undefined, raw.category as string);

  const backendStoreName = raw.storeName as string | undefined;

  return {
    productId: pid,
    productName: name,
    productImage: image,
    category: (raw.category as string) || '',
    quantity: (raw.quantity as number) || 1,
    unitPrice: (raw.unitPrice as number) || 0,
    storeName: backendStoreName || getStoreNameById(sid),
  };
}
