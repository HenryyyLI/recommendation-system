import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/store/useUserStore";
import { useState, useEffect } from "react";
import apiClient from "@/api/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Calendar, ShoppingBag, Package } from "lucide-react";

const ProfilePage = () => {
  const user = useUserStore((s) => s.user);
  const navigate = useNavigate();
  const [clientData, setClientData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get(`/api/v1/clients/${user.id}`)
      .then((res) => setClientData(res.data?.data))
      .catch(() => {});
  }, [user]);

  if (!user) {
    navigate("/");
    return null;
  }

  const d = clientData;

  const stats = [
    {
      label: "Total Purchases",
      value: (d?.TotalPurchases as number) ?? user.totalPurchases ?? 0,
      icon: ShoppingBag,
    },
    {
      label: "Total Spend",
      value: `€${((d?.TotalSpendEuro as number) ?? user.totalSpendEuro ?? 0).toFixed(2)}`,
      icon: Package,
    },
    {
      label: "Avg. Order",
      value: `€${((d?.AvgOrderValue as number) ?? user.avgOrderValue ?? 0).toFixed(2)}`,
      icon: Calendar,
    },
  ];

  const segment = (d?.ClientSegment as string) ?? user.segment ?? "Standard";
  const topCategories = [d?.TopCategory1, d?.TopCategory2, d?.TopCategory3].filter(Boolean) as string[];
  const memberSince = (d?.FirstPurchaseDate as string) ?? user.firstPurchaseDate ?? "—";
  const daysSinceLastPurchase = d?.DaysSinceLastPurchase as number | undefined;
  const purchaseFrequency = d?.PurchaseFrequency as number | undefined;

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-4">
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-muted transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">Profile</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-24 h-24 rounded-3xl overflow-hidden ring-4 ring-primary/10 shadow-lg">
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-display-alt)" }}>
              {user.name}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {(d?.ClientCountry as string) || user.country}
              <span>·</span>
              <span>Age {(d?.Age as number) || user.age}</span>
              <span>·</span>
              <span className="capitalize">{(d?.ClientGender as string) || user.gender}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-card border border-border/50 p-4 text-center">
              <s.icon className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                {s.value}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-card border border-border/50 p-4">
            <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Details
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client ID</span>
                <span className="font-medium text-xs">{(d?.ClientID as string) || user.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Segment</span>
                <span className="font-medium">{segment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Top Categories</span>
                <span className="font-medium">{topCategories.length > 0 ? topCategories.join(", ") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">
                  {memberSince && memberSince !== "—"
                    ? new Date(memberSince).toLocaleDateString("en-US", { year: "numeric", month: "short" })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days Since Last Purchase</span>
                <span className="font-medium">{daysSinceLastPurchase != null ? daysSinceLastPurchase : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchase Frequency</span>
                <span className="font-medium">{purchaseFrequency != null ? purchaseFrequency.toFixed(2) : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={() => navigate("/orders")}
            variant="outline"
            className="w-full h-12 rounded-2xl font-semibold gap-2"
          >
            <Package className="h-5 w-5" />
            View Order History
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
