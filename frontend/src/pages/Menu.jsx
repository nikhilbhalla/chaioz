import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import MenuItemCard from "@/components/MenuItemCard";
import ItemCustomizeDialog from "@/components/ItemCustomizeDialog";
import { Search } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function MenuPage() {
  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [dialogItem, setDialogItem] = useState(null);
  const { addItem } = useCart();

  useEffect(() => {
    api.get("/menu/categories").then((r) => {
      setCats(r.data || []);
      setActive(r.data?.[0]?.name || "");
    });
    api.get("/menu/items").then((r) => setItems(r.data || []));
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (active) list = list.filter((i) => i.category === active);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (i) => i.name.toLowerCase().includes(s) || (i.description || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [items, active, q]);

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

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8" data-testid="menu-page">
      <div className="mb-10">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">The full ritual</span>
        <h1 className="font-serif text-5xl md:text-6xl text-chaioz-cream mt-2">Menu</h1>
        <p className="text-chaioz-cream/70 mt-3 max-w-xl">
          71 ways to slow your evening down. Customise everything, scheduled for pickup.
        </p>
      </div>

      <div className="relative max-w-md mb-8">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-chaioz-cream/50" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the menu..."
          data-testid="menu-search"
          className="pl-11 bg-chaioz-deep border-chaioz-line text-chaioz-cream placeholder:text-chaioz-cream/40 h-12 rounded-full"
        />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-10">
        {/* Sidebar */}
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
                        ? "bg-chaioz-saffron text-chaioz-ink"
                        : "text-chaioz-cream/70 hover:text-chaioz-saffron border border-chaioz-line lg:border-transparent"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Items */}
        <div className="space-y-12">
          {Object.entries(grouped).map(([sub, list]) => (
            <div key={sub}>
              <h2 className="font-serif text-2xl text-chaioz-cream mb-5 border-b border-chaioz-line pb-2">{sub}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {list.map((it) => (
                  <MenuItemCard key={it.id} item={it} onAdd={onAdd} />
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-chaioz-cream/60 text-sm" data-testid="menu-empty">No items match your search.</p>
          )}
        </div>
      </div>

      <ItemCustomizeDialog item={dialogItem} open={!!dialogItem} onClose={() => setDialogItem(null)} />
    </div>
  );
}
