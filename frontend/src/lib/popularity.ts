import { Product } from '@/types';

/** Popularity Score = UniqueBuyers × log(TotalRevenue + 1) */
export function getPopularityScore(product: Product): number {
  const buyers = product.uniqueBuyers ?? 0;
  const revenue = product.totalRevenue ?? 0;
  if (buyers <= 0) return 0;
  return buyers * Math.log(revenue + 1);
}
