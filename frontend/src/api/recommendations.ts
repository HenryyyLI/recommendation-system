import apiClient from './client';
import { mapBackendProduct } from './mappers';
import { RecommendationResponse } from '@/types';

export async function fetchRecommendations(
  userId: string,
  page: number,
  category?: string,
): Promise<RecommendationResponse> {
  try {
    const res = await apiClient.post('/api/v1/recommendations', {
      clientId: userId,
      page,
      pageSize: 12,
      category: category || undefined,
    });

    const data = res.data?.data;
    if (!data) throw new Error('Invalid response');

    return {
      products: (data.products || []).map(mapBackendProduct),
      hasMore: data.hasMore ?? false,
      page: data.page ?? page,
    };
  } catch (error) {
    console.warn('[API] Recommendations failed:', error);
    return { products: [], hasMore: false, page };
  }
}
