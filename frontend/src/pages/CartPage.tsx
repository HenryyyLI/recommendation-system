import { useCartStore } from '@/store/useCartStore';
import { useTrackingStore } from '@/store/useTrackingStore';
import { useUserStore } from '@/store/useUserStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';

const CartPage = () => {
  const { items, updateQuantity, removeItem, totalPrice, clearCart } = useCartStore();
  const track = useTrackingStore((s) => s.track);
  const userId = useUserStore((s) => s.user?.id);
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (userId) {
      track({
        eventType: 'checkout_click',
        clientId: userId,
        page: 'cart',
        metadata: { cartTotal: totalPrice(), itemCount: items.length },
      });
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 pb-16 md:pb-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Your cart is empty
        </h2>
        <p className="text-sm text-muted-foreground mb-6">Start shopping to add items</p>
        <Button onClick={() => navigate('/feed')} variant="outline" className="rounded-2xl">
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-44 md:pb-36">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Cart ({items.length})
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="flex gap-3 rounded-2xl border border-border/50 bg-card p-3">
            <img
              src={product.image}
              alt={product.name}
              className="h-24 w-20 rounded-xl object-cover shrink-0 bg-muted"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{product.storeName}</p>
              <h3 className="text-sm font-medium line-clamp-1">{product.name}</h3>
              <p className="text-base font-bold mt-1">€{product.price.toFixed(2)}</p>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center rounded-xl border">
                  <button className="px-2 py-1 hover:bg-muted transition" onClick={() => updateQuantity(product.id, quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="px-3 text-xs font-medium">{quantity}</span>
                  <button className="px-2 py-1 hover:bg-muted transition" onClick={() => updateQuantity(product.id, quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <button className="p-1 text-destructive hover:bg-destructive/10 rounded-lg transition" onClick={() => removeItem(product.id)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-14 md:bottom-0 left-0 right-0 border-t border-border/50 bg-background/95 backdrop-blur-xl p-4 z-40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-bold">€{totalPrice().toFixed(2)}</span>
          </div>
          <Button className="w-full h-12 text-base font-semibold rounded-2xl" onClick={handleCheckout}>
            Checkout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
