import { useCartStore } from '@/store/useCartStore';
import { useUserStore } from '@/store/useUserStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createTransaction } from '@/api/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { CartItem } from '@/types';

const CheckoutPage = () => {
  const { items: cartItems, totalPrice: cartTotalPrice, clearCart } = useCartStore();
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<'form' | 'processing' | 'success'>('form');

  // Support Buy Now direct items
  const buyNowItem = (location.state as { buyNowItem?: CartItem })?.buyNowItem;
  const items: CartItem[] = buyNowItem ? [buyNowItem] : cartItems;
  const totalPrice = buyNowItem ? buyNowItem.product.price * buyNowItem.quantity : cartTotalPrice();

  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');
  const expiryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (items.length === 0 && status !== 'success') {
      navigate('/cart');
    }
  }, [items.length, status, navigate]);

  if (items.length === 0 && status !== 'success') {
    return null;
  }

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (value: string, prevValue: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    // If user is deleting the slash, remove it cleanly
    if (prevValue.length > value.length && prevValue.endsWith('/')) {
      return digits.slice(0, -1);
    }
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('processing');

    try {
      const txItems = items.map(({ product, quantity }) => ({
        productId: product.id,
        storeId: product.storeId || '0',
        quantity,
        salesNetAmountEuro: product.price * quantity,
      }));

      await createTransaction({
        clientId: user?.id || '0',
        items: txItems,
        totalAmount: typeof totalPrice === 'function' ? totalPrice : totalPrice,
        paymentMethod: 'card',
      });
    } catch (error) {
      console.warn('[Checkout] Transaction API failed (demo mode):', error);
    }

    if (!buyNowItem) clearCart();
    setStatus('success');
  };

  if (status === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-5">
          <CheckCircle className="h-9 w-9 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Payment Successful
        </h2>
        <p className="text-sm text-muted-foreground mb-8">Your order has been confirmed</p>
        <Button onClick={() => navigate('/orders')} className="h-12 px-8 rounded-2xl font-semibold">
          View Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Checkout
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Order Summary */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">Order Summary</h3>
          <div className="space-y-3">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">Qty: {quantity}</p>
                </div>
                <span className="text-sm font-semibold shrink-0">
                  €{(product.price * quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-border/50 mt-4 pt-4 flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
              €{(typeof totalPrice === 'number' ? totalPrice : totalPrice).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Payment Form */}
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Payment Details</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Number */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Card number</label>
              <div className="relative">
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="1234 1234 1234 1234"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 pl-3 pr-10 tracking-widest text-sm"
                  maxLength={19}
                  required
                />
                <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              </div>
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Expiration</label>
                <Input
                  ref={expiryRef}
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value, expiry))}
                  placeholder="MM/YY"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 tracking-wider text-sm"
                  maxLength={5}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">CVC</label>
                <Input
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CVC"
                  className="h-11 rounded-xl bg-muted/30 border-border/50 tracking-wider text-sm"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Cardholder name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name on card"
                className="h-11 rounded-xl bg-muted/30 border-border/50 text-sm"
                required
              />
            </div>

            {/* Pay Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold rounded-2xl mt-2"
              disabled={status === 'processing'}
            >
              {status === 'processing' ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Processing...
                </div>
              ) : (
                `Pay €${(typeof totalPrice === 'number' ? totalPrice : totalPrice).toFixed(2)}`
              )}
            </Button>
          </form>
        </div>

        {/* Security footer */}
        <div className="flex items-center justify-center gap-4 py-3 text-muted-foreground">
          <div className="flex items-center gap-1.5 text-xs">
            <Lock className="h-3 w-3" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <ShieldCheck className="h-3 w-3" />
            <span>Secure checkout</span>
          </div>
        </div>

        <p className="text-[10px] text-center text-muted-foreground pb-6">
          Demo mode — No real payment will be processed
        </p>
      </div>
    </div>
  );
};

export default CheckoutPage;
