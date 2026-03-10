import { create } from 'zustand';
import { Product } from '@/types';

interface FeedCacheEntry {
  products: Product[];
  page: number;
  hasMore: boolean;
  scrollY: number;
}

/** Cache key: category string or '__all__' for no filter */
function cacheKey(category: string | null): string {
  return category ?? '__all__';
}

interface ProductCacheState {
  cache: Record<string, Product>;
  setProduct: (product: Product) => void;
  getProduct: (id: string) => Product | undefined;

  /** Per-category feed cache */
  feedCaches: Record<string, FeedCacheEntry>;
  categories: string[];
  getFeedCache: (category: string | null) => FeedCacheEntry | undefined;
  setFeedCache: (category: string | null, entry: FeedCacheEntry) => void;
  setCategories: (cats: string[]) => void;
  reset: () => void;
}

export const useProductCache = create<ProductCacheState>((set, get) => ({
  cache: {},
  setProduct: (product) =>
    set((state) => ({ cache: { ...state.cache, [product.id]: product } })),
  getProduct: (id) => get().cache[id],

  feedCaches: {},
  categories: [],
  getFeedCache: (category) => get().feedCaches[cacheKey(category)],
  setFeedCache: (category, entry) =>
    set((state) => ({
      feedCaches: { ...state.feedCaches, [cacheKey(category)]: entry },
    })),
  setCategories: (cats) => set({ categories: cats }),
  reset: () => set({ cache: {}, feedCaches: {}, categories: [] }),
}));

export { cacheKey };
