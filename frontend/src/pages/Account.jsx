import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmtAUD } from "@/lib/api";
import { Award, Coffee, Repeat, Loader2, Sparkles, Phone, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Account() {
  const { user, loading, refresh } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reorderingId, setReorderingId] = useState(null);
  const [loyalty, setLoyalty] = useState(null);
  const [loyaltyBusy, setLoyaltyBusy] = useState(false);

  useEffect(() => {
    if (user) {
      api.get("/orders/me").then((r) => setOrders(r.data || []));
      api.get("/loyalty/me").then((r) => setLoyalty(r.data || null)).catch(() => setLoyalty(null));
    }
  }, [user]);

  const handleReorder = async (orderId) => {
    setReorderingId(orderId);
    try {
      const { data } = await api.post(`/orders/${orderId}/reorder`);
      toast.success(`Reordered — #${data.short_code} (+${data.points_earned} pts)`);
      const fresh = await api.get("/orders/me");
      setOrders(fresh.data || []);
      refresh();
    } catch (e) {
      toast.error("Couldn't reorder — try again");
    } finally {
      setReorderingId(null);
    }
  };

  const handleRedeem = async (tier) => {
    if (!loyalty?.account_id) return;
    if ((loyalty.balance || 0) < tier.points) {
      toast.error(`You need ${tier.points - loyalty.balance} more points`);
      return;
    }
    setLoyaltyBusy(true);
    try {
      await api.post("/loyalty/redeem", { reward_tier_id: tier.id });
      toast.success(`Reward unlocked — ${tier.name || `${tier.points} pts`}. Show this at the counter.`);
      const fresh = await api.get("/loyalty/me");
      setLoyalty(fresh.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't redeem — try again");
    } finally {
      setLoyaltyBusy(false);
    }
  };

  if (loading) return <div className="pt-32 text-center text-chaioz-teal/60" data-testid="account-loading">Brewing...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="pt-28 pb-20 max-w-5xl mx-auto px-6 sm:px-8" data-testid="account-page">
      <div className="bg-white border border-chaioz-line rounded-3xl p-8 grid sm:grid-cols-3 gap-6 grain relative overflow-hidden">
        <div className="sm:col-span-2 relative z-10">
          <p className="text-xs uppercase tracking-widest text-chaioz-saffron">Member since {new Date(user.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}</p>
          <h1 className="font-serif text-4xl text-chaioz-teal mt-2">Hi, {user.name.split(" ")[0]}.</h1>
          <p className="text-sm text-chaioz-teal/60 mt-1">{user.email}</p>
        </div>
        <div className="text-right relative z-10">
          <p className="text-xs uppercase tracking-widest text-chaioz-teal/60">Loyalty</p>
          <p className="font-serif text-4xl text-chaioz-saffron mt-1" data-testid="account-points">{loyalty?.balance ?? user.loyalty_points ?? 0}</p>
          <p className="text-xs text-chaioz-teal/80 inline-flex items-center gap-1 mt-1"><Award className="w-3 h-3 text-chaioz-saffron"/> {user.loyalty_tier} tier</p>
        </div>
      </div>

      {/* ----- Square Loyalty card ----- */}
      <div className="mt-8 border border-chaioz-line bg-white rounded-3xl p-6" data-testid="loyalty-card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-chaioz-saffron/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-chaioz-saffron" />
            </div>
            <div>
              <p className="font-serif text-2xl text-chaioz-teal">Chaioz Loyalty</p>
              <p className="text-xs text-chaioz-teal/60">Earn 1 pt for every $1 spent. Synced with Square.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest text-chaioz-teal/60">Available points</p>
            <p className="font-serif text-3xl text-chaioz-saffron" data-testid="loyalty-balance">{loyalty?.balance ?? 0}</p>
          </div>
        </div>

        {loyalty?.needs_phone ? (
          <div className="flex items-center gap-2 text-sm text-chaioz-teal/70 bg-chaioz-cream rounded-xl px-4 py-3" data-testid="loyalty-needs-phone">
            <Phone className="w-4 h-4 text-chaioz-saffron" />
            Add a mobile number on checkout to start earning Square Loyalty points.
          </div>
        ) : (loyalty?.tiers && loyalty.tiers.length > 0) ? (
          <div className="grid sm:grid-cols-2 gap-3" data-testid="loyalty-tiers">
            {loyalty.tiers.map((t) => {
              const pts = t.points || 0;
              const ok = (loyalty.balance || 0) >= pts;
              return (
                <div key={t.id || t.name} className="border border-chaioz-line rounded-2xl p-4 flex items-center justify-between" data-testid={`loyalty-tier-${pts}`}>
                  <div>
                    <p className="font-medium text-chaioz-teal">{t.name || `${pts} pts reward`}</p>
                    <p className="text-xs text-chaioz-teal/60">{pts} points</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleRedeem(t)}
                    disabled={!ok || loyaltyBusy || !loyalty.account_id}
                    className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-40"
                    data-testid={`loyalty-redeem-${pts}`}
                  >
                    {ok ? "Redeem" : `${pts - (loyalty.balance || 0)} to go`}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-chaioz-teal/60">Reward tiers will appear once Square Loyalty is connected for your store.</p>
        )}
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-serif text-3xl text-chaioz-teal">Your orders</h2>
          <Link to="/menu"><Button variant="outline" size="sm" className="rounded-full bg-transparent border-chaioz-line text-chaioz-teal hover:text-chaioz-saffron" data-testid="account-order-cta">Browse menu</Button></Link>
        </div>

        {orders.length === 0 ? (
          <p className="text-chaioz-teal/60 text-sm" data-testid="account-no-orders">No orders yet. <Link to="/menu" className="text-chaioz-saffron hover:underline">Start your ritual</Link>.</p>
        ) : (
          <ul className="divide-y divide-chaioz-line border border-chaioz-line rounded-2xl bg-white">
            {orders.map((o) => (
              <li key={o.id} data-testid={`order-${o.id}`} className="p-5 flex flex-wrap items-center gap-4 justify-between">
                <div className="flex-1 min-w-[200px]">
                  <p className="font-serif text-xl text-chaioz-teal">#{o.short_code}</p>
                  <p className="text-xs text-chaioz-teal/60">{new Date(o.created_at).toLocaleString("en-AU")} • {o.items.length} items</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full border border-chaioz-saffron/40 text-chaioz-saffron">{o.status}</span>
                  <span className="text-chaioz-saffron text-lg">{fmtAUD(o.total)}</span>
                  <Button
                    size="sm"
                    onClick={() => handleReorder(o.id)}
                    disabled={reorderingId === o.id}
                    data-testid={`reorder-${o.id}`}
                    className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal"
                  >
                    {reorderingId === o.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Repeat className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Reorder
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-12 border border-chaioz-line bg-white rounded-2xl p-6 flex items-center gap-4" data-testid="marketing-optin">
        <Bell className="w-7 h-7 text-chaioz-saffron flex-shrink-0"/>
        <div className="flex-1">
          <p className="text-chaioz-teal font-medium">Notify me when a new combo drops</p>
          <p className="text-xs text-chaioz-teal/60">Push notifications only — opt-out any time. Stays separate from order alerts (those always arrive).</p>
        </div>
        <button
          role="switch"
          aria-checked={!!user.marketing_opt_in}
          data-testid="marketing-optin-toggle"
          onClick={async () => {
            const next = !user.marketing_opt_in;
            try {
              await api.patch("/auth/me/preferences", { marketing_opt_in: next });
              await refresh();
              toast.success(next ? "You're on the combo VIP list 🎉" : "Opted out — we'll go quiet.");
            } catch {
              toast.error("Couldn't update — try again");
            }
          }}
          className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${user.marketing_opt_in ? "bg-chaioz-saffron" : "bg-chaioz-line"}`}
        >
          <span className={`absolute top-0.5 ${user.marketing_opt_in ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow-sm transition-all`} />
        </button>
      </div>

      <div className="mt-6 border border-chaioz-line bg-white rounded-2xl p-6 flex items-center gap-4">
        <Coffee className="w-8 h-8 text-chaioz-saffron"/>
        <div>
          <p className="text-chaioz-teal">Refer a friend, you both get $5 credit.</p>
          <p className="text-xs text-chaioz-teal/60">Coming soon in the app.</p>
        </div>
      </div>
    </div>
  );
}
