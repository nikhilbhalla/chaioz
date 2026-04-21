import { useEffect, useState } from "react";
import { api, fmtAUD } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

export default function Store() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const { addItem } = useCart();

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data || []));
  }, []);

  const cats = ["All", ...Array.from(new Set(products.map((p) => p.category)))];
  const list = filter === "All" ? products : products.filter((p) => p.category === filter);

  const addToCart = (p) => {
    addItem({
      item_id: p.id,
      name: `[Retail] ${p.name}`,
      price: p.price,
      qty: 1,
      size: null,
      addons: [],
      notes: p.is_subscription ? "Subscription product" : null,
      line_total: p.price,
    });
    toast.success(`${p.name} added to cart`);
  };

  return (
    <div className="pt-28 pb-20 max-w-7xl mx-auto px-6 sm:px-8" data-testid="store-page">
      <div className="mb-10">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Take Chaioz home</span>
        <h1 className="font-serif text-5xl md:text-6xl text-chaioz-teal mt-2">The Shop</h1>
        <p className="text-chaioz-teal/70 mt-3 max-w-xl">
          Hand-blended chai, ceramic cups, and gift boxes designed for the late-night ritual.
        </p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            data-testid={`store-filter-${c.toLowerCase().replace(/\s/g, "-")}`}
            className={`whitespace-nowrap text-sm uppercase tracking-wide px-4 py-2 rounded-full ${
              filter === c
                ? "bg-chaioz-saffron text-chaioz-teal"
                : "border border-chaioz-line text-chaioz-teal/80 hover:text-chaioz-saffron"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((p) => (
          <div
            key={p.id}
            data-testid={`product-card-${p.id}`}
            className="bg-white border border-chaioz-line rounded-2xl overflow-hidden hover:border-chaioz-saffron/50 transition-all duration-300 group"
          >
            <div className="relative h-56 overflow-hidden">
              <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
              {p.is_subscription && (
                <span className="absolute top-3 left-3 bg-chaioz-saffron text-chaioz-teal text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Subscription
                </span>
              )}
            </div>
            <div className="p-5">
              <p className="text-xs uppercase tracking-widest text-chaioz-saffron">{p.category}</p>
              <h3 className="font-serif text-2xl text-chaioz-teal mt-1">{p.name}</h3>
              <p className="text-sm text-chaioz-teal/60 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
              <div className="flex justify-between items-center mt-5">
                <span className="text-lg text-chaioz-saffron">{fmtAUD(p.price)}</span>
                <Button
                  size="sm"
                  onClick={() => addToCart(p)}
                  data-testid={`product-add-${p.id}`}
                  className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full"
                >
                  <ShoppingBag className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
