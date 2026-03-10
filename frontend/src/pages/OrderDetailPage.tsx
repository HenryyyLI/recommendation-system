import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { useState, useEffect } from "react";
import { fetchOrderDetail } from "@/api/orders";
import { Order, LogisticsStatus } from "@/types";
import { ArrowLeft, Check, Loader2 } from "lucide-react";

const ALL_STATUSES: LogisticsStatus[] = [
  "CREATED",
  "PENDING_PAYMENT",
  "PAID",
  "READY_TO_SHIP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const statusLabels: Record<LogisticsStatus, string> = {
  CREATED: "Created",
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  READY_TO_SHIP: "Ready to Ship",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const STATUS_DESC: Record<LogisticsStatus, string> = {
  CREATED: "Order has been created",
  PENDING_PAYMENT: "Awaiting payment confirmation",
  PAID: "Payment received successfully",
  READY_TO_SHIP: "Package is ready for shipment",
  IN_TRANSIT: "Package is on its way",
  OUT_FOR_DELIVERY: "Package is out for delivery",
  DELIVERED: "Package has been delivered",
};

function generateLogisticsFromStatus(status: LogisticsStatus, orderDate: string) {
  const idx = ALL_STATUSES.indexOf(status);
  if (idx < 0) return [];
  const base = new Date(orderDate);
  return ALL_STATUSES.slice(0, idx + 1).map((s, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    d.setHours(8 + i * 3, i * 15, 0, 0);
    return { status: s, timestamp: d.toISOString(), description: STATUS_DESC[s] };
  });
}

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Get order summary from route state (passed from OrderHistoryPage)
  const orderSummary = (location.state as { orderSummary?: Record<string, unknown> })?.orderSummary;

  useEffect(() => {
    if (!user || !orderId) {
      navigate("/");
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchOrderDetail(orderId, user.id);
        if (result) {
          setOrder(result);
          return;
        }
      } catch {
        // backend failed
      }

      // Fallback: construct from route state summary
      if (orderSummary) {
        const status = (orderSummary.status as LogisticsStatus) || "CREATED";
        const orderDate = (orderSummary.orderDate as string) || new Date().toISOString();
        setOrder({
          orderId: String(orderSummary.orderId || orderId),
          clientId: user.id,
          clientName: user.name || "",
          orderDate,
          totalAmount: (orderSummary.totalAmount as number) || 0,
          items: [],
          logistics: generateLogisticsFromStatus(status, orderDate),
          currentStatus: status,
        });
      }

      setLoading(false);
    };

    load().finally(() => setLoading(false));
  }, [orderId, user, navigate, orderSummary]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  const currentIdx = ALL_STATUSES.indexOf(order.currentStatus);

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-4">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Order Details
            </h1>
            <p className="text-[10px] text-muted-foreground">{order.orderId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Order Summary */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-muted-foreground">Order Date</p>
              <p className="text-sm font-medium">
                {new Date(order.orderDate).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold" style={{ fontFamily: "var(--font-display)" }}>
                €{order.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
            Items ({order.items.length})
          </h2>
          <div className="space-y-3">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex gap-3 rounded-2xl border border-border/50 bg-card p-3">
                <div className="w-20 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{item.category}</p>
                  <h3 className="text-sm font-medium line-clamp-1">{item.productName}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.storeName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold" style={{ fontFamily: "var(--font-display)" }}>
                      €{item.unitPrice.toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logistics Timeline */}
        <div>
          <h2 className="text-sm font-semibold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            Shipping Progress
          </h2>
          <div className="relative pl-8">
            {ALL_STATUSES.map((status, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              const logNode = order.logistics.find((l) => l.status === status);

              return (
                <div key={status} className="relative pb-8 last:pb-0">
                  {idx < ALL_STATUSES.length - 1 && (
                    <div
                      className={`absolute left-[-20px] top-6 w-0.5 h-full ${
                        idx < currentIdx ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                  <div
                    className={`absolute left-[-26px] top-0.5 w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                      isCurrent
                        ? "border-primary bg-primary shadow-md shadow-primary/30"
                        : isCompleted
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                    }`}
                  >
                    {isCompleted && !isCurrent && <Check className="h-2 w-2 text-primary-foreground" />}
                  </div>
                  <div className={`${isCompleted ? "" : "opacity-40"}`}>
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium ${isCurrent ? "text-primary" : ""}`}>{statusLabels[status]}</p>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Current
                        </span>
                      )}
                    </div>
                    {logNode && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(logNode.timestamp).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {logNode?.description || statusLabels[status]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailPage;
