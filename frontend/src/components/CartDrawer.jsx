import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ShoppingBag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { api, fmtAUD } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const UPSELL_BY_KEYWORD = [
  { keywords: ["chai", "coffee", "matcha"], target_name: "Pistachio Milkcake", copy: "Treat yourself — add" },
  { keywords: ["milkcake", "churros", "jamun", "halwa"], target_name: "Masala Chai", copy: "Pair with" },
  { keywords: ["wrap", "bowl", "toastie", "sandwich"], target_name: "Masala Chips", copy: "Add a side of" },
];

export default function CartDrawer() {
  const { items, open, setOpen, updateQty, removeItem, totals, addItem } = useCart();
  const nav = useNavigate();
  const [upsell, setUpsell] = useState(null);

  useEffect(() => {
    if (!open || items.length === 0) return;
    // Pick the first matching upsell rule based on what's in the cart (and target not already there)
    const names = items.map((i) => (i.name || "").toLowerCase());
    const rule = UPSELL_BY_KEYWORD.find((r) => {
      const match = names.some((n) => r.keywords.some((k) => n.includes(k)));
      const present = names.some((n) => n.includes(r.target_name.toLowerCase()));
      return match && !present;
    });
    if (!rule) {
      setUpsell(null);
      return;
    }
    api.get("/menu/items", { params: { q: rule.target_name } }).then((res) => {
      const exact = (res.data || []).find((x) => x.name === rule.target_name);
      if (exact) setUpsell({ item: exact, copy: rule.copy });
    });
  }, [open, items]);

  const acceptUpsell = () => {
    if (!upsell?.item) return;
    const it = upsell.item;
    addItem({
      item_id: it.id,
      name: it.name,
      price: it.price,
      qty: 1,
      size: null,
      addons: [],
      notes: null,
      line_total: it.price,
    });
    toast.success(`${it.name} added`);
    setUpsell(null);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        data-testid="cart-drawer"
        className="bg-white border-chaioz-line text-chaioz-teal w-full sm:max-w-md flex flex-col p-0"
      >
        <SheetHeader className="px-6 py-5 border-b border-chaioz-line">
          <SheetTitle className="font-serif text-2xl text-chaioz-teal flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-chaioz-saffron" /> Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {items.length === 0 && (
            <div className="text-center py-20 text-chaioz-teal/60" data-testid="cart-empty">
              <p className="text-sm">Your cart is empty.</p>
              <p className="text-xs mt-1">Time for a chai ritual.</p>
            </div>
          )}

          {items.map((it) => (
            <div key={it._key} data-testid={`cart-line-${it._key}`} className="border border-chaioz-line rounded-xl p-4">
              <div className="flex justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.name}</p>
                  {it.addons?.length > 0 && (
                    <p className="text-xs text-chaioz-teal/60 mt-1">+ {it.addons.join(", ")}</p>
                  )}
                  {it.notes && <p className="text-xs italic text-chaioz-teal/50 mt-1">"{it.notes}"</p>}
                </div>
                <span className="text-sm text-chaioz-saffron whitespace-nowrap">{fmtAUD(it.line_total)}</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="outline" onClick={() => updateQty(it._key, it.qty - 1)} data-testid={`cart-dec-${it._key}`} className="h-7 w-7 rounded-full bg-transparent border-chaioz-line text-chaioz-teal">
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-sm w-6 text-center">{it.qty}</span>
                  <Button size="icon" variant="outline" onClick={() => updateQty(it._key, it.qty + 1)} data-testid={`cart-inc-${it._key}`} className="h-7 w-7 rounded-full bg-transparent border-chaioz-line text-chaioz-teal">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
                <button onClick={() => removeItem(it._key)} data-testid={`cart-remove-${it._key}`} className="text-chaioz-teal/50 hover:text-chaioz-ember">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {upsell?.item && items.length > 0 && (
            <div
              data-testid="cart-upsell"
              className="mt-4 p-4 border-2 border-dashed border-chaioz-saffron/50 rounded-xl bg-chaioz-saffronSoft/30 flex items-center gap-3"
            >
              {upsell.item.image && (
                <img src={upsell.item.image} alt="" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-wider text-chaioz-saffron flex items-center gap-1">
                  <Star className="w-3 h-3" /> {upsell.copy}
                </p>
                <p className="text-sm font-medium mt-0.5 truncate">{upsell.item.name}</p>
                <p className="text-xs text-chaioz-teal/65">for just {fmtAUD(upsell.item.price)}</p>
              </div>
              <Button
                size="sm"
                onClick={acceptUpsell}
                data-testid="cart-upsell-add"
                className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal whitespace-nowrap"
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-chaioz-line px-6 py-5 space-y-4">
            <div className="flex justify-between text-sm text-chaioz-teal/80">
              <span>Subtotal</span>
              <span data-testid="cart-subtotal">{fmtAUD(totals.subtotal)}</span>
            </div>
            <Button
              onClick={() => {
                setOpen(false);
                nav("/checkout");
              }}
              data-testid="cart-checkout-button"
              className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-12 text-base"
            >
              Checkout • {fmtAUD(totals.subtotal)}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
