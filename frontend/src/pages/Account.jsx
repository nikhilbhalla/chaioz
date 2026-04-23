import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmtAUD } from "@/lib/api";
import { Award, Coffee, Repeat, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Account() {
  const { user, loading, refresh } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reorderingId, setReorderingId] = useState(null);

  useEffect(() => {
    if (user) api.get("/orders/me").then((r) => setOrders(r.data || []));
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
          <p className="font-serif text-4xl text-chaioz-saffron mt-1" data-testid="account-points">{user.loyalty_points || 0}</p>
          <p className="text-xs text-chaioz-teal/80 inline-flex items-center gap-1 mt-1"><Award className="w-3 h-3 text-chaioz-saffron"/> {user.loyalty_tier} tier</p>
        </div>
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

      <div className="mt-12 border border-chaioz-line bg-white rounded-2xl p-6 flex items-center gap-4">
        <Coffee className="w-8 h-8 text-chaioz-saffron"/>
        <div>
          <p className="text-chaioz-teal">Refer a friend, you both get $5 credit.</p>
          <p className="text-xs text-chaioz-teal/60">Coming soon in the app.</p>
        </div>
      </div>
    </div>
  );
}
