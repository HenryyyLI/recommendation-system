import { useState, useEffect, useRef } from 'react';
import { Product } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useUserStore } from '@/store/useUserStore';
import { useProductCache } from '@/store/useProductCache';
import { Flame } from 'lucide-react';
import { getPopularityScore } from '@/lib/popularity';
import { getProductImageById } from '@/api/mappers';

interface ProductCardProps {
  product: Product;
  position?: number;
}

// More varied ratios — no square (1:1) to avoid equal-height pairs
const ASPECT_CLASSES = [
  'aspect-[3/4]',
  'aspect-[2/3]',
  'aspect-[4/5]',
  'aspect-[5/7]',
  'aspect-[3/5]',
  'aspect-[7/9]',
  'aspect-[5/8]',
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ProductCard = ({ product, position }: ProductCardProps) => {
  const navigate = useNavigate();
  const track = useTrackingStore((s) => s.track);
  const userId = useUserStore((s) => s.user?.id);
  const cacheProduct = useProductCache((s) => s.setProduct);
  const [loaded, setLoaded] = useState(() => {
    if (product.image) {
      const img = new Image();
      img.src = product.image;
      return img.complete && img.naturalWidth > 0;
    }
    return false;
  });
  const [error, setError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpression = useRef(false);

  // Use hash + position offset to ensure adjacent cards differ
  const aspect = ASPECT_CLASSES[(hashId(product.id) + (position || 0) * 3) % ASPECT_CLASSES.length];

  const popScore = getPopularityScore(product);

  // Impression tracking
  useEffect(() => {
    if (!cardRef.current || !userId) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTrackedImpression.current) {
          hasTrackedImpression.current = true;
          track({
            eventType: 'product_impression',
            clientId: userId,
            productId: product.id,
            page: 'feed',
            position,
          });
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [userId, product.id, position, track]);

  const handleClick = () => {
    cacheProduct(product);
    if (userId) {
      track({
        eventType: 'product_click',
        clientId: userId,
        productId: product.id,
        page: 'feed',
        position,
      });
    }
    navigate(`/product/${product.id}`);
  };

  return (
    <div ref={cardRef} className="cursor-pointer group" onClick={handleClick}>
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className={`${aspect} overflow-hidden relative bg-muted`}>
          {!loaded && !error && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted-foreground/10" />
          )}
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-muted-foreground text-xs">No image</span>
            </div>
          ) : (
            <img
              src={product.image}
              alt={product.name}
              className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
              loading="lazy"
              onLoad={() => setLoaded(true)}
              onError={(e) => {
                if (!triedFallback) {
                  setTriedFallback(true);
                  setLoaded(false);
                  (e.target as HTMLImageElement).src = getProductImageById(product.id);
                } else {
                  setError(true);
                }
              }}
            />
          )}
        </div>

        <div className="p-3 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium truncate" style={{ fontFamily: 'var(--font-body)' }}>
              {product.category}
            </p>
            {popScore > 0 && (
              <div className="flex items-center gap-0.5 text-accent shrink-0 ml-1">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">{popScore.toFixed(1)}</span>
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium text-card-foreground line-clamp-2 leading-snug">
            {product.name}
          </h3>
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              €{product.price.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground truncate ml-2">
              {product.storeName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
