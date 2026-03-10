import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useState, useEffect } from 'react';
import { fetchOrders, OrderSummary } from '@/api/orders';
import { ArrowLeft, ChevronRight, Package, Loader2 } from 'lucide-react';

const statusColors: Record<string, string> = {
  CREATED: 'bg-muted text-muted-foreground',
  PENDING_PAYMENT: 'bg-secondary text-secondary-foreground',
  PAID: 'bg-primary/10 text-primary',
  READY_TO_SHIP: 'bg-accent/10 text-accent',
  IN_TRANSIT: 'bg-accent/20 text-accent',
  OUT_FOR_DELIVERY: 'bg-accent/30 text-accent',
  DELIVERED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const OrderHistoryPage = () => {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { navigate('/'); return; }

    const loadOrders = async () => {
      setLoading(true);
      try {
        const result = await fetchOrders(user.id);
        setOrders(result.orders);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Orders
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h2 className="text-lg font-semibold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              No orders yet
            </h2>
            <p className="text-sm text-muted-foreground">Start shopping to see your orders here</p>
          </div>
        ) : (
          orders.map((order) => (
            <button
              key={order.orderId}
              onClick={() => navigate(`/orders/${order.orderId}`, { state: { orderSummary: order } })}
              className="w-full rounded-2xl border border-border/50 bg-card p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {order.orderId}
                  </p>
                  <p className="text-sm font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                    €{order.totalAmount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.orderDate).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                    {' · '}
                    {order.itemCount} item{order.itemCount > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2.5 py-1 rounded-full ${statusColors[order.status] || ''}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default OrderHistoryPage;
