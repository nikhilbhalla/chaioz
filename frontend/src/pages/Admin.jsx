import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmtAUD } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, Repeat, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

export default function Admin() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    Promise.all([
      api.get("/admin/stats").then((r) => setStats(r.data)),
      api.get("/admin/orders").then((r) => setOrders(r.data)),
      api.get("/admin/menu").then((r) => setItems(r.data)),
      api.get("/admin/products").then((r) => setProducts(r.data)),
    ]).catch(() => {});
  }, [user]);

  if (loading) return <div className="pt-32 text-center text-chaioz-cream/60">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/account" replace />;

  const updateStatus = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success("Order status updated");
  };

  const toggleAvail = async (it) => {
    await api.put(`/admin/menu/${it.id}`, { is_available: !it.is_available });
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, is_available: !it.is_available } : x)));
    toast.success(`${it.name} ${it.is_available ? "hidden" : "made available"}`);
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8" data-testid="admin-page">
      <h1 className="font-serif text-5xl text-chaioz-cream mb-8">Admin</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Today's revenue", value: fmtAUD(stats.today_revenue), icon: DollarSign, testid: "stat-today-rev" },
            { label: "Today's orders", value: stats.today_orders, icon: ShoppingBag, testid: "stat-today-orders" },
            { label: "Avg. order value (7d)", value: fmtAUD(stats.aov), icon: TrendingUp, testid: "stat-aov" },
            { label: "Repeat customers", value: `${stats.repeat_customer_rate}%`, icon: Repeat, testid: "stat-repeat" },
          ].map((s, i) => (
            <div key={i} data-testid={s.testid} className="border border-chaioz-line bg-chaioz-deep rounded-2xl p-5">
              <s.icon className="w-5 h-5 text-chaioz-saffron mb-2" />
              <p className="text-2xl text-chaioz-cream font-medium">{s.value}</p>
              <p className="text-xs text-chaioz-cream/60 mt-1 uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {stats?.daily_revenue_14d && (
        <div className="border border-chaioz-line bg-chaioz-deep rounded-2xl p-6 mb-10" data-testid="revenue-chart">
          <h3 className="font-serif text-2xl text-chaioz-cream mb-4">Daily revenue (last 14 days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.daily_revenue_14d}>
                <CartesianGrid stroke="#1A2E2C" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#A3A3A3" tick={{ fontSize: 11 }} />
                <YAxis stroke="#A3A3A3" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "#0A1413", border: "1px solid #1A2E2C", borderRadius: 8, color: "#FDFBF7" }} />
                <Line type="monotone" dataKey="revenue" stroke="#E8A84A" strokeWidth={2.5} dot={{ r: 3, fill: "#E8A84A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Tabs defaultValue="orders">
        <TabsList className="bg-chaioz-deep border border-chaioz-line">
          <TabsTrigger value="orders" data-testid="admin-tab-orders" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-ink">Orders</TabsTrigger>
          <TabsTrigger value="menu" data-testid="admin-tab-menu" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-ink">Menu</TabsTrigger>
          <TabsTrigger value="products" data-testid="admin-tab-products" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-ink">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <div className="border border-chaioz-line rounded-2xl bg-chaioz-deep overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-chaioz-cream/60 border-b border-chaioz-line">
                <tr>
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Items</th>
                  <th className="text-left p-4">Total</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} data-testid={`admin-order-${o.id}`} className="border-b border-chaioz-line/50">
                    <td className="p-4">
                      <p className="font-medium text-chaioz-cream">#{o.short_code}</p>
                      <p className="text-xs text-chaioz-cream/60">{new Date(o.created_at).toLocaleString("en-AU")}</p>
                    </td>
                    <td className="p-4 text-chaioz-cream/80">{o.customer_name}<br/><span className="text-xs text-chaioz-cream/50">{o.customer_phone}</span></td>
                    <td className="p-4 text-chaioz-cream/80">{o.items.length}</td>
                    <td className="p-4 text-chaioz-saffron">{fmtAUD(o.total)}</td>
                    <td className="p-4">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className="bg-chaioz-ink border-chaioz-line text-chaioz-cream w-36 h-9" data-testid={`order-status-${o.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-chaioz-deep border-chaioz-line text-chaioz-cream">
                          {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-chaioz-cream/60">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((it) => (
              <div key={it.id} data-testid={`admin-menu-${it.id}`} className="border border-chaioz-line bg-chaioz-deep rounded-xl p-4 flex justify-between gap-3">
                <div>
                  <p className="text-chaioz-cream font-medium text-sm">{it.name}</p>
                  <p className="text-xs text-chaioz-cream/60">{it.category} · {fmtAUD(it.price)}</p>
                </div>
                <Button size="sm" variant={it.is_available ? "outline" : "default"} onClick={() => toggleAvail(it)} className="rounded-full bg-transparent border-chaioz-line text-chaioz-cream hover:text-chaioz-saffron text-xs">
                  {it.is_available ? "Hide" : "Show"}
                </Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <ul className="divide-y divide-chaioz-line border border-chaioz-line rounded-2xl bg-chaioz-deep">
            {products.map((p) => (
              <li key={p.id} className="p-4 flex justify-between" data-testid={`admin-product-${p.id}`}>
                <div>
                  <p className="text-chaioz-cream font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-chaioz-cream/60">{p.category}</p>
                </div>
                <span className="text-chaioz-saffron">{fmtAUD(p.price)}</span>
              </li>
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </div>
  );
}
