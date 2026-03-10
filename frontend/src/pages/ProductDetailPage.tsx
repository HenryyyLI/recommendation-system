import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useUserStore } from '@/store/useUserStore';
import { useProductCache } from '@/store/useProductCache';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, ShoppingCart, Zap, Minus, Plus, Store, MapPin, Package, TrendingUp, Users, Globe, Tag, Calendar, Flame } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPopularityScore } from '@/lib/popularity';
import { getProductImageById } from '@/api/mappers';

/* ── Sub-components for PDP sections ── */

const PdpHeader = ({ product }: { product: Product }) => {
  const categoryParts = [product.universe, product.category, product.familyLevel1, product.familyLevel2]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  const stars = Math.round(product.rating);
  const popScore = getPopularityScore(product);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-1 flex-wrap" style={{ fontFamily: 'var(--font-body)' }}>
          {categoryParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className="mx-0.5">·</span>}
              {part}
            </span>
          ))}
        </p>
        {popScore > 0 && (
          <div className="flex items-center gap-1 text-accent shrink-0 ml-2">
            <Flame className="h-4 w-4" />
            <span className="text-sm font-bold">{popScore.toFixed(1)}</span>
          </div>
        )}
      </div>
      <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        {product.name}
      </h1>
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-4 w-4 ${i < stars ? 'text-accent fill-accent' : 'text-muted'}`} />
        ))}
        <span className="text-sm text-muted-foreground ml-1">{product.rating.toFixed(1)}</span>
        {product.uniqueBuyers != null && product.uniqueBuyers > 0 && (
          <span className="text-xs text-muted-foreground ml-2">({product.uniqueBuyers.toLocaleString()} buyers)</span>
        )}
      </div>
      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
          €{product.price.toFixed(2)}
        </p>
        {product.avgUnitPrice != null && product.avgUnitPrice > 0 && product.avgUnitPrice !== product.price && (
          <p className="text-sm text-muted-foreground">Avg unit: €{product.avgUnitPrice.toFixed(2)}</p>
        )}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
    </div>
  );
};

const PdpSalesStats = ({ product }: { product: Product }) => {
  const has7d = product.sales7d != null && product.sales7d > 0;
  const has30d = product.sales30d != null && product.sales30d > 0;
  const hasTotal = product.totalSales != null && product.totalSales > 0;
  if (!has7d && !has30d && !hasTotal) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Sales Performance</h2>
      <div className="flex gap-3 flex-wrap">
        {has7d && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/10 px-3 py-2 flex-1 min-w-[120px]">
            <TrendingUp className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[10px] text-primary uppercase tracking-[0.1em] font-medium">7d Sales</p>
              <p className="text-sm font-bold text-primary">{product.sales7d!.toLocaleString()}</p>
            </div>
          </div>
        )}
        {has30d && (
          <div className="flex items-center gap-2 rounded-xl bg-accent/5 border border-accent/10 px-3 py-2 flex-1 min-w-[120px]">
            <TrendingUp className="h-4 w-4 text-accent shrink-0" />
            <div>
              <p className="text-[10px] text-accent uppercase tracking-[0.1em] font-medium">30d Sales</p>
              <p className="text-sm font-bold text-accent">{product.sales30d!.toLocaleString()}</p>
            </div>
          </div>
        )}
        {hasTotal && (
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 flex-1 min-w-[120px]">
            <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">Total</p>
              <p className="text-sm font-bold">{product.totalSales!.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PdpInfoGrid = ({ product }: { product: Product }) => (
  <div className="rounded-2xl border border-border/50 bg-card p-4">
    <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">Product Info</h2>
    <div className="grid grid-cols-2 gap-3">
      <InfoCell icon={Store} label="Store" value={product.storeName} />
      <InfoCell icon={MapPin} label="Ships from" value={product.storeCountry || '—'} />
      <InfoCell icon={Package} label="In Stock" value={`${product.stockQuantity} units`} />
      {product.stockCountries != null && product.stockCountries > 0 && (
        <InfoCell icon={Globe} label="Stock Countries" value={String(product.stockCountries)} />
      )}
      {product.uniqueBuyers != null && product.uniqueBuyers > 0 && (
        <InfoCell icon={Users} label="Unique Buyers" value={product.uniqueBuyers.toLocaleString()} />
      )}
      {product.universe && (
        <InfoCell icon={Tag} label="Universe" value={product.universe} />
      )}
    </div>
  </div>
);

const InfoCell = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-3">
    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">{label}</p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  </div>
);

const PdpDates = ({ product, quantity, setQuantity }: { product: Product; quantity: number; setQuantity: (q: number) => void }) => {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4 flex items-center justify-between gap-4">
      <div className="flex gap-5 text-sm flex-wrap">
        {product.firstSaleDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">First Sale</p>
              <p className="font-medium">{fmt(product.firstSaleDate)}</p>
            </div>
          </div>
        )}
        {product.lastSaleDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.1em]">Last Sale</p>
              <p className="font-medium">{fmt(product.lastSaleDate)}</p>
            </div>
          </div>
        )}
      </div>
      {/* Quantity selector */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-sm font-medium">Quantity</span>
        <div className="flex items-center rounded-xl border">
          <button className="px-2.5 py-1.5 hover:bg-muted transition" onClick={() => setQuantity(Math.max(1, quantity - 1))}>
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="px-3 py-1.5 text-sm font-semibold min-w-[2rem] text-center">{quantity}</span>
          <button className="px-2.5 py-1.5 hover:bg-muted transition" onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}>
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main PDP ── */

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const track = useTrackingStore((s) => s.track);
  const userId = useUserStore((s) => s.user?.id);
  const cachedProduct = useProductCache((s) => (id ? s.getProduct(id) : undefined));
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [triedFallback, setTriedFallback] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(() => {
    if (typeof window !== 'undefined' && cachedProduct?.image) {
      const img = new Image();
      img.src = cachedProduct.image;
      return img.complete && img.naturalWidth > 0;
    }
    return false;
  });

  useEffect(() => {
    if (!id) return;
    if (cachedProduct) {
      setProduct(cachedProduct);
      return;
    }
  }, [id, cachedProduct]);

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Product not found</p>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, quantity);
    if (userId) {
      track({ eventType: 'add_to_cart', clientId: userId, productId: product.id, page: 'pdp', metadata: { quantity } });
    }
    toast({ title: 'Added to cart', description: `${product.name} × ${quantity}` });
  };

  const handleBuyNow = () => {
    // Buy Now goes directly to checkout without adding to cart
    if (userId) {
      track({ eventType: 'buy_now', clientId: userId, productId: product.id, page: 'pdp', metadata: { quantity } });
    }
    navigate('/checkout', { state: { buyNowItem: { product, quantity } } });
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-20">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Product Details</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Hero image */}
        <div className="px-4 pt-4">
          <div className="aspect-[4/5] md:aspect-[3/2] overflow-hidden relative bg-muted rounded-2xl">
            {!imgLoaded && <div className="absolute inset-0 animate-pulse bg-muted rounded-2xl" />}
            <img
              src={product.image}
              alt={product.name}
              className={`h-full w-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={(e) => {
                if (!triedFallback) {
                  setTriedFallback(true);
                  setImgLoaded(false);
                  (e.target as HTMLImageElement).src = getProductImageById(product.id);
                }
              }}
            />
          </div>
        </div>

        {/* Content sections */}
        <div className="px-4 py-5 space-y-3">
          <PdpHeader product={product} />
          <PdpSalesStats product={product} />
          <PdpInfoGrid product={product} />
          <PdpDates product={product} quantity={quantity} setQuantity={setQuantity} />
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-xl p-4 z-40">
        <div className="max-w-3xl mx-auto flex gap-3">
          <Button variant="outline" className="flex-1 h-12 gap-2 font-semibold rounded-2xl" onClick={handleAddToCart}>
            <ShoppingCart className="h-5 w-5" />
            Add to Cart
          </Button>
          <Button className="flex-1 h-12 gap-2 font-semibold rounded-2xl" onClick={handleBuyNow}>
            <Zap className="h-5 w-5" />
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
