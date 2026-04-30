import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, fmtAUD } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, ShoppingBag, Repeat, DollarSign, Plus, Pencil, Trash2, Search, Truck, Sun, Moon, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import MenuItemEditor from "@/components/admin/MenuItemEditor";
import ComboEditor from "@/components/admin/ComboEditor";
import ProductEditor from "@/components/admin/ProductEditor";

const STATUS = ["pending", "confirmed", "preparing", "ready", "completed", "cancelled"];

export default function Admin() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [combos, setCombos] = useState([]);
  const [comboEditing, setComboEditing] = useState(null);
  const [comboEditorOpen, setComboEditorOpen] = useState(false);
  const [productEditing, setProductEditing] = useState(null);
  const [productEditorOpen, setProductEditorOpen] = useState(false);
  const [q, setQ] = useState("");

  const reload = () => {
    setStatsLoading(true);
    Promise.all([
      api.get("/admin/stats").then((r) => setStats(r.data)),
      api.get("/admin/orders").then((r) => setOrders(r.data)),
      api.get("/admin/menu").then((r) => setItems(r.data)),
      api.get("/admin/products").then((r) => setProducts(r.data)),
      api.get("/admin/combos").then((r) => setCombos(r.data)),
    ]).catch(() => {}).finally(() => setStatsLoading(false));
  };

  useEffect(() => {
    if (user?.role === "admin") reload();
  }, [user]);

  if (loading) return <div className="pt-32 text-center text-chaioz-teal/60">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/account" replace />;

  const updateStatus = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    toast.success(status === "ready" ? "Customer notified via SMS" : "Order status updated");
  };

  const deleteItem = async (it) => {
    if (!window.confirm(`Delete "${it.name}"?`)) return;
    await api.delete(`/admin/menu/${it.id}`);
    toast.success("Item deleted");
    reload();
  };

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (it) => { setEditing(it); setEditorOpen(true); };

  const openNewCombo = () => { setComboEditing(null); setComboEditorOpen(true); };
  const openEditCombo = (c) => { setComboEditing(c); setComboEditorOpen(true); };
  const deleteCombo = async (c) => {
    if (!window.confirm(`Delete combo "${c.name}"?`)) return;
    await api.delete(`/admin/combos/${c.id}`);
    toast.success("Combo deleted");
    reload();
  };

  const openNewProduct = () => { setProductEditing(null); setProductEditorOpen(true); };
  const openEditProduct = (p) => { setProductEditing(p); setProductEditorOpen(true); };
  const deleteProduct = async (p) => {
    if (!window.confirm(`Delete product "${p.name}"?`)) return;
    await api.delete(`/admin/products/${p.id}`);
    toast.success("Product deleted");
    reload();
  };

  const filteredItems = items.filter(
    (it) =>
      !q ||
      it.name.toLowerCase().includes(q.toLowerCase()) ||
      (it.category || "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8" data-testid="admin-page">
      <h1 className="font-serif text-5xl text-chaioz-teal mb-8">Admin</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border border-chaioz-line bg-white rounded-2xl p-5 space-y-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-7 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          : stats && [
              { label: "Today's revenue", value: fmtAUD(stats.today_revenue), icon: DollarSign, testid: "stat-today-rev" },
              { label: "Today's orders", value: stats.today_orders, icon: ShoppingBag, testid: "stat-today-orders" },
              { label: "Avg. order value (7d)", value: fmtAUD(stats.aov), icon: TrendingUp, testid: "stat-aov" },
              { label: "Repeat customers", value: `${stats.repeat_customer_rate}%`, icon: Repeat, testid: "stat-repeat" },
            ].map((s, i) => (
              <div key={i} data-testid={s.testid} className="border border-chaioz-line bg-white rounded-2xl p-5">
                <s.icon className="w-5 h-5 text-chaioz-saffron mb-2" />
                <p className="text-2xl text-chaioz-teal font-medium">{s.value}</p>
                <p className="text-xs text-chaioz-teal/60 mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
      </div>

      {statsLoading ? (
        <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mb-10">
          <div className="border border-chaioz-line bg-white rounded-2xl p-6">
            <Skeleton className="h-7 w-56 mb-4" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="border border-chaioz-line bg-white rounded-2xl p-6">
            <Skeleton className="h-7 w-40 mb-4" />
            <Skeleton className="h-44 w-full rounded-xl" />
          </div>
        </div>
      ) : stats?.daily_revenue_14d && (
        <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mb-10">
          <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="revenue-chart">
            <h3 className="font-serif text-2xl text-chaioz-teal mb-4">Daily revenue (last 14 days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.daily_revenue_14d}>
                  <CartesianGrid stroke="#E0DACE" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#6B7B7A" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6B7B7A" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#FFFFFF", border: "1px solid #E0DACE", borderRadius: 8, color: "#0F4C4A" }} />
                  <Line type="monotone" dataKey="revenue" stroke="#E8A84A" strokeWidth={2.5} dot={{ r: 3, fill: "#E8A84A" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="morning-vs-evening">
            <h3 className="font-serif text-2xl text-chaioz-teal mb-4">Morning vs Evening</h3>
            <div className="h-44 relative">
              {(stats.morning_revenue || 0) === 0 && (stats.evening_revenue || 0) === 0 ? (
                <div data-testid="me-pie-empty" className="h-full flex flex-col items-center justify-center text-chaioz-teal/50 text-sm">
                  <span>No orders yet in the last 30 days</span>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Morning (5am–2pm)", value: stats.morning_revenue || 0 },
                          { name: "Evening (2pm–late)", value: stats.evening_revenue || 0 },
                        ]}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        <Cell fill="#E8A84A" />
                        <Cell fill="#0F4C4A" />
                      </Pie>
                      <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} contentStyle={{ background: "#FFFFFF", border: "1px solid #E0DACE", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {((stats.morning_revenue || 0) === 0 || (stats.evening_revenue || 0) === 0) && (
                    <div data-testid="me-pie-hint" className="absolute inset-x-0 bottom-0 text-center text-[10px] text-chaioz-teal/50 italic">
                      {(stats.morning_revenue || 0) === 0 ? "No morning orders yet this fortnight" : "No evening orders yet this fortnight"}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div className="flex items-center gap-1.5"><Sun className="w-3.5 h-3.5 text-chaioz-saffron"/> <span className="font-medium">{fmtAUD(stats.morning_revenue || 0)}</span> · {stats.morning_orders} ord</div>
              <div className="flex items-center gap-1.5"><Moon className="w-3.5 h-3.5 text-chaioz-teal"/> <span className="font-medium">{fmtAUD(stats.evening_revenue || 0)}</span> · {stats.evening_orders} ord</div>
            </div>
          </div>
        </div>
      )}

      {statsLoading ? (
        <div className="border border-chaioz-line bg-white rounded-2xl p-6 mb-10">
          <Skeleton className="h-7 w-52 mb-4" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : stats?.hourly_revenue_today && (
        <div className="border border-chaioz-line bg-white rounded-2xl p-6 mb-10" data-testid="hourly-revenue">
          <h3 className="font-serif text-2xl text-chaioz-teal mb-4">Revenue by hour (today)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.hourly_revenue_today}>
                <CartesianGrid stroke="#E0DACE" strokeDasharray="3 3" />
                <XAxis dataKey="hour" stroke="#6B7B7A" tick={{ fontSize: 10 }} interval={1} />
                <YAxis stroke="#6B7B7A" tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} contentStyle={{ background: "#FFFFFF", border: "1px solid #E0DACE", borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#E8A84A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Tabs defaultValue="orders">
        <TabsList className="bg-white border border-chaioz-line">
          <TabsTrigger value="orders" data-testid="admin-tab-orders" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Orders</TabsTrigger>
          <TabsTrigger value="menu" data-testid="admin-tab-menu" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Menu</TabsTrigger>
          <TabsTrigger value="combos" data-testid="admin-tab-combos" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Combos</TabsTrigger>
          <TabsTrigger value="products" data-testid="admin-tab-products" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Products</TabsTrigger>
          <TabsTrigger value="broadcast" data-testid="admin-tab-broadcast" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Broadcast</TabsTrigger>
          <TabsTrigger value="settings" data-testid="admin-tab-settings" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Settings</TabsTrigger>
          <TabsTrigger value="account" data-testid="admin-tab-account" className="data-[state=active]:bg-chaioz-saffron data-[state=active]:text-chaioz-teal">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <div className="border border-chaioz-line rounded-2xl bg-white overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-chaioz-teal/60 border-b border-chaioz-line">
                <tr>
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Fulfilment</th>
                  <th className="text-left p-4">Total</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} data-testid={`admin-order-${o.id}`} className="border-b border-chaioz-line/50">
                    <td className="p-4">
                      <p className="font-medium text-chaioz-teal">#{o.short_code}</p>
                      <p className="text-xs text-chaioz-teal/60">{new Date(o.created_at).toLocaleString("en-AU")}</p>
                    </td>
                    <td className="p-4 text-chaioz-teal/80">{o.customer_name}<br/><span className="text-xs text-chaioz-teal/50">{o.customer_phone}</span></td>
                    <td className="p-4 text-chaioz-teal/80 text-xs uppercase tracking-wider">
                      {o.fulfillment === "delivery" ? (
                        <span className="inline-flex items-center gap-1 text-chaioz-saffron">
                          <Truck className="w-3 h-3" /> Delivery
                        </span>
                      ) : (
                        "Pickup"
                      )}
                    </td>
                    <td className="p-4 text-chaioz-saffron">{fmtAUD(o.total)}</td>
                    <td className="p-4">
                      <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                        <SelectTrigger className="bg-chaioz-cream border-chaioz-line text-chaioz-teal w-36 h-9" data-testid={`order-status-${o.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-chaioz-line text-chaioz-teal">
                          {STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-chaioz-teal/60">No orders yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="menu" className="mt-6">
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-chaioz-teal/50" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search menu..." data-testid="admin-menu-search" className="pl-9 bg-white border-chaioz-line text-chaioz-teal" />
            </div>
            <Button
              onClick={async () => {
                try {
                  const { data } = await api.post("/admin/sync/square-menu");
                  toast.success(`Square sync — matched ${data.matched}, ${data.flipped} availability changes`);
                  const fresh = await api.get("/admin/menu");
                  setItems(fresh.data);
                } catch (e) {
                  toast.error(e.response?.data?.detail || "Sync failed");
                }
              }}
              variant="outline"
              data-testid="admin-menu-sync-square"
              className="rounded-full border-chaioz-line bg-white text-chaioz-teal hover:text-chaioz-saffron"
            >
              Sync from Square
            </Button>
            <Button onClick={openNew} data-testid="admin-menu-new" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              <Plus className="w-4 h-4 mr-1" /> New item
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((it) => (
              <div key={it.id} data-testid={`admin-menu-${it.id}`} className="border border-chaioz-line bg-white rounded-xl overflow-hidden flex">
                <div className="w-20 h-20 flex-shrink-0 bg-chaioz-cream">
                  {it.image && <img src={it.image} alt={it.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-chaioz-teal font-medium text-sm truncate">{it.name}</p>
                    <p className="text-xs text-chaioz-teal/60">{it.category} · {fmtAUD(it.price)}</p>
                    <div className="flex gap-1 mt-1">
                      {it.is_bestseller && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chaioz-saffron/20 text-chaioz-saffron">★ Bestseller</span>}
                      {!it.is_available && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">Hidden</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(it)} data-testid={`edit-${it.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-chaioz-saffron">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteItem(it)} data-testid={`delete-${it.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="combos" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-2xl text-chaioz-teal">Smart combos</h3>
              <p className="text-xs text-chaioz-teal/60 mt-1">Bundle menu items with a discount. Shown on the home page.</p>
            </div>
            <Button onClick={openNewCombo} data-testid="admin-combo-new" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              <Plus className="w-4 h-4 mr-1" /> New combo
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {combos.map((c) => {
              const original = c.items.reduce((s, n) => {
                const it = items.find((m) => m.name === n);
                return s + (it?.price || 0);
              }, 0);
              const save = Math.max(0, +(original - (c.bundle_price || 0)).toFixed(2));
              return (
                <div key={c.id} data-testid={`admin-combo-${c.id}`} className="border border-chaioz-line bg-white rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-chaioz-saffron" />
                        <h4 className="font-medium text-chaioz-teal text-lg">{c.name}</h4>
                        {!c.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 uppercase tracking-wider">Hidden</span>}
                        {c.badge && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chaioz-saffron/20 text-chaioz-saffron uppercase tracking-wider">{c.badge}</span>}
                      </div>
                      <p className="text-xs text-chaioz-teal/60 mt-1">{c.tagline}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditCombo(c)} data-testid={`combo-edit-${c.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-chaioz-saffron">
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteCombo(c)} data-testid={`combo-delete-${c.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.items.map((n) => {
                      const found = items.find((m) => m.name === n);
                      return (
                        <span key={n} className={`text-[11px] px-2 py-0.5 rounded-full border ${found ? "bg-chaioz-cream border-chaioz-line text-chaioz-teal" : "bg-red-50 border-red-200 text-red-500"}`}>
                          {n}{!found && " (missing)"}
                        </span>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-chaioz-line/70">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-chaioz-teal/60">Original</p>
                      <p className="text-sm text-chaioz-teal/80 line-through">{fmtAUD(original)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-chaioz-teal/60">Bundle</p>
                      <p className="text-sm text-chaioz-teal font-medium">{fmtAUD(c.bundle_price)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-chaioz-saffron">Save</p>
                      <p className="text-sm text-chaioz-saffron font-medium">{fmtAUD(save)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            {combos.length === 0 && (
              <div className="col-span-2 p-10 text-center text-chaioz-teal/60 border border-dashed border-chaioz-line rounded-2xl" data-testid="combos-empty">
                No combos yet. Create your first to drive upsells.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-2xl text-chaioz-teal">Retail products</h3>
              <p className="text-xs text-chaioz-teal/60 mt-1">Chai blends, gift boxes, merch + subscriptions sold via the Shop page.</p>
            </div>
            <Button onClick={openNewProduct} data-testid="admin-product-new" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              <Plus className="w-4 h-4 mr-1" /> New product
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map((p) => (
              <div key={p.id} data-testid={`admin-product-${p.id}`} className="border border-chaioz-line bg-white rounded-xl overflow-hidden flex">
                <div className="w-24 h-24 flex-shrink-0 bg-chaioz-cream">
                  {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                  <div>
                    <p className="text-chaioz-teal font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-chaioz-teal/60">{p.category} · {fmtAUD(p.price)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.is_subscription && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chaioz-saffron/20 text-chaioz-saffron uppercase tracking-wider">Subscription</span>}
                      {p.stock !== undefined && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-chaioz-cream border border-chaioz-line text-chaioz-teal/70">{p.stock} in stock</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Button size="icon" variant="ghost" onClick={() => openEditProduct(p)} data-testid={`product-edit-${p.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-chaioz-saffron">
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteProduct(p)} data-testid={`product-delete-${p.id}`} className="h-7 w-7 text-chaioz-teal/70 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-6">
          <BroadcastTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <AccountTab user={user} />
        </TabsContent>
      </Tabs>

      <MenuItemEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        item={editing}
        onSaved={reload}
      />

      <ComboEditor
        open={comboEditorOpen}
        onClose={() => setComboEditorOpen(false)}
        combo={comboEditing}
        menuItems={items}
        onSaved={reload}
      />

      <ProductEditor
        open={productEditorOpen}
        onClose={() => setProductEditorOpen(false)}
        product={productEditing}
        onSaved={reload}
      />
    </div>
  );
}

function SettingsTab() {
  const [s, setS] = useState({ pickup_only: false, soft_launch_banner: "" });
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get("/admin/settings").then((r) => {
      setS(r.data || s);
      setLoaded(true);
    }).catch(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (patch) => {
    setBusy(true);
    try {
      const { data } = await api.put("/admin/settings", patch);
      setS(data);
      toast.success("Saved");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <div className="text-chaioz-teal/60">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-5" data-testid="admin-settings">
      <div className="border border-chaioz-line bg-white rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-serif text-xl text-chaioz-teal">Pickup-only mode</h3>
            <p className="text-xs text-chaioz-teal/60 mt-1">When ON, the website refuses new delivery orders and returns "Delivery temporarily unavailable" to the customer. Use this until Uber Direct integration is live or whenever you can't dispatch deliveries.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={s.pickup_only}
            disabled={busy}
            data-testid="settings-pickup-only-toggle"
            onClick={() => save({ pickup_only: !s.pickup_only })}
            className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${s.pickup_only ? "bg-chaioz-saffron" : "bg-chaioz-line"}`}
          >
            <span className={`absolute top-0.5 ${s.pickup_only ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow-sm transition-all`} />
          </button>
        </div>
      </div>

      <div className="border border-chaioz-line bg-white rounded-2xl p-6">
        <h3 className="font-serif text-xl text-chaioz-teal">Soft-launch banner</h3>
        <p className="text-xs text-chaioz-teal/60 mt-1">Saffron strip across the top of every page. Leave blank to hide. Customers can dismiss it per session.</p>
        <textarea
          value={s.soft_launch_banner}
          onChange={(e) => setS({ ...s, soft_launch_banner: e.target.value })}
          maxLength={280}
          rows={2}
          placeholder="e.g. We're in soft launch — if anything looks off, DM @chaioz"
          data-testid="settings-banner-text"
          className="mt-3 w-full rounded-xl bg-chaioz-cream border border-chaioz-line text-chaioz-teal p-3 text-sm focus:outline-none focus:ring-2 focus:ring-chaioz-saffron"
        />
        <p className="text-[11px] text-chaioz-teal/40 mt-1">{280 - s.soft_launch_banner.length} chars left</p>
        <Button
          onClick={() => save({ soft_launch_banner: s.soft_launch_banner })}
          disabled={busy}
          data-testid="settings-banner-save"
          className="mt-3 rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save banner"}
        </Button>
      </div>
    </div>
  );
}

function BroadcastTab() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("opted_in");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const titleLeft = 80 - title.length;
  const bodyLeft = 200 - body.length;
  const ok = title.trim().length > 0 && body.trim().length > 0 && titleLeft >= 0 && bodyLeft >= 0;

  const send = async () => {
    if (!ok) return;
    const audienceLabel = audience === "opted_in" ? "customers who opted in" : "EVERY device";
    if (!window.confirm(`Send "${title}" to ${audienceLabel}?`)) return;
    setBusy(true);
    setLastResult(null);
    try {
      const { data } = await api.post("/admin/broadcast/push", { title, body, audience });
      setLastResult(data);
      toast.success(`Broadcast sent to ${data.sent} devices (${data.audience})`);
      setTitle("");
      setBody("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Broadcast failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl border border-chaioz-line bg-white rounded-2xl p-6" data-testid="admin-broadcast">
      <h3 className="font-serif text-2xl text-chaioz-teal">Push notification broadcast</h3>
      <p className="text-xs text-chaioz-teal/60 mt-1">Apple/Google penalise senders who push to people that didn't opt in. Default to <strong>Opted-in only</strong> unless it's a critical operational alert.</p>

      <div className="mt-5">
        <label className="text-xs text-chaioz-teal/70">Audience</label>
        <div className="mt-2 flex gap-2 flex-wrap" data-testid="broadcast-audience">
          {[
            { id: "opted_in", label: "Opted-in customers", hint: "Recommended — safer for sender reputation." },
            { id: "all", label: "Everyone", hint: "Use only for service-level alerts (e.g. closing early)." },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAudience(opt.id)}
              data-testid={`broadcast-audience-${opt.id}`}
              className={`text-left px-4 py-3 rounded-xl border transition-colors flex-1 min-w-[200px] ${
                audience === opt.id
                  ? "border-chaioz-saffron bg-chaioz-saffron/10 text-chaioz-teal"
                  : "border-chaioz-line bg-white text-chaioz-teal/80 hover:border-chaioz-saffron/50"
              }`}
            >
              <p className="font-medium text-sm">{opt.label}</p>
              <p className="text-[11px] text-chaioz-teal/60 mt-1">{opt.hint}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <label className="text-xs text-chaioz-teal/70">Title <span className={titleLeft < 0 ? "text-red-500" : "text-chaioz-teal/40"}>({titleLeft})</span></label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Brekie combo 25% off this Saturday"
          maxLength={120}
          data-testid="broadcast-title"
          className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
        />
      </div>
      <div className="mt-4">
        <label className="text-xs text-chaioz-teal/70">Body <span className={bodyLeft < 0 ? "text-red-500" : "text-chaioz-teal/40"}>({bodyLeft})</span></label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tap to grab a Karak + Bun Maska before 10am — Saturday only."
          rows={3}
          maxLength={300}
          data-testid="broadcast-body"
          className="mt-1 w-full rounded-xl bg-chaioz-cream border border-chaioz-line text-chaioz-teal p-3 text-sm focus:outline-none focus:ring-2 focus:ring-chaioz-saffron"
        />
      </div>
      <Button
        onClick={send}
        disabled={!ok || busy}
        data-testid="broadcast-send"
        className="mt-5 rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-50"
      >
        {busy ? "Sending..." : `Send to ${audience === "opted_in" ? "opted-in customers" : "everyone"}`}
      </Button>
      {lastResult && (
        <p className="mt-3 text-xs text-chaioz-teal/70" data-testid="broadcast-result">
          Last result: sent to <strong>{lastResult.sent}</strong> devices ({lastResult.audience}){lastResult.errors ? ` · ${lastResult.errors} errors` : ""}.
        </p>
      )}
    </div>
  );
}


function AccountTab({ user }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [showPw, setShowPw] = useState(false);

  const rules = [
    { label: "8+ characters", ok: next.length >= 8 },
    { label: "At least one letter", ok: /[A-Za-z]/.test(next) },
    { label: "At least one number", ok: /\d/.test(next) },
    { label: "Different from current", ok: next.length > 0 && next !== current },
    { label: "Matches confirmation", ok: next.length > 0 && next === confirm },
  ];
  const allOk = rules.every((r) => r.ok) && current.length > 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!allOk) {
      setErr("Please fix the highlighted rules");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api.post("/auth/change-password", {
        current_password: current,
        new_password: next,
      });
      toast.success("Password updated. Use the new one next time you sign in.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5" data-testid="admin-account">
      <div className="border border-chaioz-line bg-white rounded-2xl p-6">
        <h3 className="font-serif text-xl text-chaioz-teal">Account</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-chaioz-teal/60">Email</dt>
            <dd className="text-chaioz-teal font-medium" data-testid="admin-account-email">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-chaioz-teal/60">Role</dt>
            <dd className="text-chaioz-teal font-medium uppercase tracking-wider text-xs">{user.role}</dd>
          </div>
        </dl>
      </div>

      <form onSubmit={submit} className="border border-chaioz-line bg-white rounded-2xl p-6 space-y-4" data-testid="admin-change-password">
        <div>
          <h3 className="font-serif text-xl text-chaioz-teal">Change password</h3>
          <p className="text-xs text-chaioz-teal/60 mt-1">Rotate your admin password. You'll stay logged in on this device but other sessions will silently sign out.</p>
        </div>

        <div>
          <Label className="text-chaioz-teal/80">Current password</Label>
          <Input
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            data-testid="change-password-current"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
        </div>

        <div>
          <Label className="text-chaioz-teal/80">New password</Label>
          <Input
            value={next}
            onChange={(e) => setNext(e.target.value)}
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            data-testid="change-password-new"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
        </div>

        <div>
          <Label className="text-chaioz-teal/80">Confirm new password</Label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            data-testid="change-password-confirm"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-chaioz-teal/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            data-testid="change-password-show"
            className="accent-chaioz-saffron"
          />
          Show passwords
        </label>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1" data-testid="change-password-rules">
          {rules.map((r) => (
            <li key={r.label} className={`text-[11px] inline-flex items-center gap-1 ${r.ok ? "text-emerald-600" : "text-chaioz-teal/50"}`}>
              {r.ok ? "✓" : "✕"} {r.label}
            </li>
          ))}
        </ul>

        {err && <p className="text-sm text-red-500" data-testid="change-password-error">{err}</p>}

        <Button
          type="submit"
          disabled={busy || !allOk}
          data-testid="change-password-submit"
          className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-50"
        >
          {busy ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}
