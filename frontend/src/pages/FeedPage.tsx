import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { fetchRecommendations } from '@/api/recommendations';
import { Product } from '@/types';
import ProductCard from '@/components/ProductCard';
import UserDropdown from '@/components/UserDropdown';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProductCache } from '@/store/useProductCache';

/* ── Skeleton aspect ratios matching ProductCard ── */
const SKELETON_ASPECTS = [
  'aspect-[3/4]', 'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[5/7]',
  'aspect-[3/5]', 'aspect-[7/9]', 'aspect-[5/8]', 'aspect-[3/4]',
  'aspect-[2/3]', 'aspect-[4/5]', 'aspect-[5/7]', 'aspect-[3/5]',
];

function useColumnCount() {
  const [cols, setCols] = useState(() => {
    if (typeof window === 'undefined') return 2;
    const w = window.innerWidth;
    return w >= 1024 ? 4 : w >= 768 ? 3 : 2;
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w >= 1024 ? 4 : w >= 768 ? 3 : 2);
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return cols;
}

function distributeToColumns<T>(items: T[], numCols: number): T[][] {
  const columns: T[][] = Array.from({ length: numCols }, () => []);
  items.forEach((item, i) => columns[i % numCols].push(item));
  return columns;
}

function SkeletonCard({ aspectClass }: { aspectClass: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden">
      <div className={`${aspectClass} bg-muted animate-pulse`} />
      <div className="p-3 space-y-2">
        <div className="h-2.5 w-1/3 rounded bg-muted animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count = 12, numCols }: { count?: number; numCols: number }) {
  const items = Array.from({ length: count }, (_, i) => SKELETON_ASPECTS[i % SKELETON_ASPECTS.length]);
  const columns = distributeToColumns(items, numCols);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-3">
          {col.map((aspect, ri) => (
            <SkeletonCard key={ri} aspectClass={aspect} />
          ))}
        </div>
      ))}
    </div>
  );
}

const FeedPage = () => {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const numCols = useColumnCount();

  // Disable browser's built-in scroll restoration so we control it
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
  }, []);

  const setFeedCacheStore = useProductCache((s) => s.setFeedCache);
  const storedCategories = useProductCache((s) => s.categories);
  const setStoredCategories = useProductCache((s) => s.setCategories);

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const selectedCategoryRef = useRef<string | null>(null);

  // Initialize state from cache synchronously
  const initCache = useProductCache.getState().getFeedCache(null);
  const [allProducts, setAllProducts] = useState<Product[]>(initCache?.products ?? []);
  const [page, setPage] = useState(initCache?.page ?? 0);
  const [initialLoading, setInitialLoading] = useState(!initCache || initCache.products.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initCache?.hasMore ?? true);
  const [searchQuery, setSearchQuery] = useState('');
  const [knownCategories, setKnownCategories] = useState<string[]>(storedCategories);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);
  /** Tracks the last known scrollY so cleanup can use it after DOM is removed */
  const lastScrollYRef = useRef(0);

  /**
   * scrollReadyRef gates the IntersectionObserver:
   * - false = scroll is being restored, observer must NOT fire
   * - true  = scroll is restored, observer may fire normally
   */
  const scrollReadyRef = useRef(false);

  /**
   * pendingScrollRef: the scroll position to restore.
   * Set by category-change effect, consumed by the restoration effect.
   */
  const pendingScrollRef = useRef<number | null>(
    initCache && initCache.products.length > 0 ? (initCache.scrollY ?? 0) : null,
  );

  /**
   * restoreTick: incremented to force the scroll restoration effect to re-run
   * even when allProducts reference hasn't changed (e.g. returning from PDP
   * where the cached array is the same reference).
   */
  const [restoreTick, setRestoreTick] = useState(initCache && initCache.products.length > 0 ? 1 : 0);

  // Keep ref in sync with state
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  // Save scroll per category (throttled) + keep lastScrollYRef always fresh
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      // Always update the ref so cleanup has the latest value
      lastScrollYRef.current = window.scrollY;

      if (!ticking && scrollReadyRef.current) {
        ticking = true;
        requestAnimationFrame(() => {
          if (!scrollReadyRef.current) { ticking = false; return; }
          const cat = selectedCategoryRef.current;
          const entry = useProductCache.getState().getFeedCache(cat);
          if (entry) {
            useProductCache.getState().setFeedCache(cat, { ...entry, scrollY: window.scrollY });
          }
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      const cat = selectedCategoryRef.current;
      const entry = useProductCache.getState().getFeedCache(cat);
      if (entry && entry.products.length > 0) {
        useProductCache.getState().setFeedCache(cat, { ...entry, scrollY: lastScrollYRef.current });
      }
      scrollReadyRef.current = false;
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Restore scroll BEFORE paint using useLayoutEffect
  useLayoutEffect(() => {
    if (pendingScrollRef.current == null) return;
    if (initialLoading) return;

    const targetY = pendingScrollRef.current;
    pendingScrollRef.current = null;
    window.scrollTo(0, targetY);

    requestAnimationFrame(() => {
      if (Math.abs(window.scrollY - targetY) > 5) {
        window.scrollTo(0, targetY);
      }
      scrollReadyRef.current = true;
    });
  }, [restoreTick, initialLoading]);

  useEffect(() => {
    if (!user) { navigate('/'); return; }
  }, [user, navigate]);

  useEffect(() => {
    const cats = new Set(knownCategories);
    allProducts.forEach((p) => { if (p.category) cats.add(p.category); });
    const sorted = Array.from(cats).sort();
    if (sorted.length !== knownCategories.length || sorted.some((c, i) => c !== knownCategories[i])) {
      setKnownCategories(sorted);
      setStoredCategories(sorted);
    }
  }, [allProducts]);

  const persistToCache = useCallback(
    (products: Product[], pg: number, more: boolean, category: string | null) => {
      const entry = useProductCache.getState().getFeedCache(category);
      setFeedCacheStore(category, {
        products,
        page: pg,
        hasMore: more,
        scrollY: entry?.scrollY ?? 0,
      });
    },
    [setFeedCacheStore],
  );

  const loadProducts = useCallback(
    async (pageNum: number, category?: string | null, reset = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (reset) {
        setInitialLoading(true);
        scrollReadyRef.current = false;
      } else {
        setLoadingMore(true);
      }
      try {
        const res = await fetchRecommendations(user?.id || '', pageNum, category || undefined);
        let newProducts: Product[];
        if (reset) {
          newProducts = res.products;
          setAllProducts(newProducts);
        } else {
          // Read current products from cache (not React state) to avoid async setState issue
          const currentEntry = useProductCache.getState().getFeedCache(category ?? null);
          const currentProducts = currentEntry?.products ?? [];
          newProducts = [...currentProducts, ...res.products];
          setAllProducts(newProducts);
        }
        setHasMore(res.hasMore);
        setPage(pageNum);
        persistToCache(newProducts, pageNum, res.hasMore, category ?? null);

        if (reset) {
          // After a fresh fetch, scroll to top and trigger restoration
          pendingScrollRef.current = 0;
          setRestoreTick((t) => t + 1);
        }
      } finally {
        isFetchingRef.current = false;
        if (reset) setInitialLoading(false);
        else setLoadingMore(false);
      }
    },
    [user, persistToCache],
  );

  // On category change or mount: restore from cache or fetch fresh
  useEffect(() => {
    if (!user) return;

    // Disable observer until scroll is restored
    scrollReadyRef.current = false;

    const entry = useProductCache.getState().getFeedCache(selectedCategory);
    if (entry && entry.products.length > 0) {
      setAllProducts(entry.products);
      setPage(entry.page);
      setHasMore(entry.hasMore);
      setInitialLoading(false);

      // Schedule scroll restoration — use tick to force effect re-run
      pendingScrollRef.current = entry.scrollY;
      setRestoreTick((t) => t + 1);
    } else {
      loadProducts(0, selectedCategory, true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedCategory]);

  // IntersectionObserver for infinite scroll — ONLY fires when scrollReadyRef is true
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !initialLoading &&
          !isFetchingRef.current &&
          scrollReadyRef.current
        ) {
          loadProducts(page + 1, selectedCategory);
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, initialLoading, page, selectedCategory, loadProducts]);

  const trimmedSearch = searchQuery.trim();
  const displayProducts = trimmedSearch.length > 0
    ? allProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmedSearch.toLowerCase()) ||
          p.category.toLowerCase().includes(trimmedSearch.toLowerCase()),
      )
    : allProducts;

  const productColumns = distributeToColumns(displayProducts, numCols);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6 flex flex-col">
      <header className="sticky top-0 md:top-14 z-20 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/40 border-none h-10 rounded-xl"
              />
            </div>
            <div className="md:hidden">
              <UserDropdown />
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <Button
              variant={selectedCategory === null ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="shrink-0 rounded-full text-xs h-8"
            >
              All
            </Button>
            {knownCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="shrink-0 rounded-full text-xs h-8"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pt-4 flex-1 w-full">
        {initialLoading ? (
          <SkeletonGrid count={numCols * 3} numCols={numCols} />
        ) : displayProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {productColumns.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-3">
                {col.map((product, ri) => (
                  <ProductCard key={product.id} product={product} position={ci + ri * numCols} />
                ))}
                {loadingMore && Array.from({ length: 3 }).map((_, si) => (
                  <SkeletonCard key={`sk-${si}`} aspectClass={SKELETON_ASPECTS[(ci + si * numCols) % SKELETON_ASPECTS.length]} />
                ))}
              </div>
            ))}
          </div>
        )}

        <div ref={loadMoreRef} className="h-10" />

        {!hasMore && allProducts.length > 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">You've seen it all ✨</p>
        )}
      </main>
    </div>
  );
};

export default FeedPage;
