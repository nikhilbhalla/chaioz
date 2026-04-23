import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import MenuItemCard from "@/components/MenuItemCard";
import ItemCustomizeDialog from "@/components/ItemCustomizeDialog";
import { Search, Zap, DollarSign, Clock, Leaf, Moon, Candy, Utensils, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useDayMode } from "@/contexts/DayModeContext";

const FILTERS = [
  { id: "quick_breakfast", label: "Quick Breakfast", icon: Zap },
  { id: "ready_in_5", label: "Ready in 5 mins", icon: Clock },
  { id: "under_10", label: "Under $10", icon: DollarSign },
  { id: "late_night", label: "Late night favourite", icon: Moon },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "sweet", label: "Sweet", icon: Candy },
  { id: "savoury", label: "Savoury", icon: Utensils },
];

export default function MenuPage() {
  const [params] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [activeTags, setActiveTags] = useState(new Set());
  const [dialogItem, setDialogItem] = useState(null);
  const { addItem } = useCart();
  const { isMorning } = useDayMode();

  useEffect(() => {
    api.get("/menu/categories").then((r) => {
      setCats(r.data || []);
      // Default category based on time of day
      const preferred = isMorning ? "Breakfast" : (r.data?.[0]?.name || "");
      const hasPreferred = (r.data || []).some((c) => c.name === preferred);
      setActive(hasPreferred ? preferred : (r.data?.[0]?.name || ""));
    });
    api.get("/menu/items").then((r) => setItems(r.data || []));
    // Accept ?tag= from deep links (e.g. "Order Breakfast" CTA)
    const initial = params.get("tag");
    if (initial) setActiveTags(new Set(initial.split(",")));
  }, [isMorning, params]);

  const toggleTag = (id) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let list = items;
    if (active) list = list.filter((i) => i.category === active);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(s) || (i.description || "").toLowerCase().includes(s)
      );
    }
    if (activeTags.size > 0) {
      list = list.filter((i) => Array.from(activeTags).every((t) => (i.tags || []).includes(t)));
    }
    return list;
  }, [items, active, q, activeTags]);

  const grouped = useMemo(() => {
    const out = {};
    filtered.forEach((it) => {
      const k = it.subcategory || "All";
      out[k] = out[k] || [];
      out[k].push(it);
    });
    return out;
  }, [filtered]);

  const onAdd = (item) => {
    if (item.sizes?.length || item.addons?.length) setDialogItem(item);
    else
      addItem({
        item_id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        size: null,
        addons: [],
        notes: null,
        line_total: item.price,
      });
  };

  const clearFilters = () => { setActiveTags(new Set()); setQ(""); };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8" data-testid="menu-page">
      <div className="mb-10">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">The full ritual</span>
        <h1 className="font-serif text-5xl md:text-6xl text-chaioz-teal mt-2">Menu</h1>
        <p className="text-chaioz-teal/70 mt-3 max-w-xl">
          73 ways to slow your evening down. Customise everything, scheduled for pickup.
        </p>
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-chaioz-teal/50" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the menu..."
          data-testid="menu-search"
          className="pl-11 bg-white border-chaioz-line text-chaioz-teal placeholder:text-chaioz-teal/40 h-12 rounded-full"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-8" data-testid="menu-filters">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          const on = activeTags.has(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleTag(f.id)}
              data-testid={`filter-${f.id}`}
              className={`inline-flex items-center gap-1.5 text-xs uppercase tracking-wider px-3 py-2 rounded-full border transition-colors ${
                on
                  ? "bg-chaioz-teal text-chaioz-cream border-chaioz-teal"
                  : "bg-white text-chaioz-teal/80 border-chaioz-line hover:border-chaioz-saffron hover:text-chaioz-saffron"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {f.label}
            </button>
          );
        })}
        {(activeTags.size > 0 || q) && (
          <button
            onClick={clearFilters}
            data-testid="filter-clear"
            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-chaioz-ember hover:underline ml-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="lg:sticky lg:top-28 self-start">
          <div className="overflow-x-auto lg:overflow-visible no-scrollbar">
            <ul className="flex lg:flex-col gap-2">
              {cats.map((c) => (
                <li key={c.name}>
                  <button
                    onClick={() => setActive(c.name)}
                    data-testid={`cat-${c.name.replace(/\s/g, "-").toLowerCase()}`}
                    className={`whitespace-nowrap text-sm tracking-wide uppercase px-4 py-2 rounded-full transition-colors lg:w-full lg:text-left ${
                      active === c.name
                        ? "bg-chaioz-saffron text-chaioz-teal"
                        : "text-chaioz-teal/70 hover:text-chaioz-saffron border border-chaioz-line lg:border-transparent"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="space-y-12">
          {Object.entries(grouped).map(([sub, list]) => (
            <div key={sub}>
              <h2 className="font-serif text-2xl text-chaioz-teal mb-5 border-b border-chaioz-line pb-2">{sub}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((it) => (
                  <MenuItemCard key={it.id} item={it} onAdd={onAdd} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-chaioz-teal/60 text-sm" data-testid="menu-empty">No items match your search.</p>
          )}
        </div>
      </div>

      <ItemCustomizeDialog item={dialogItem} open={!!dialogItem} onClose={() => setDialogItem(null)} />
    </div>
  );
}
