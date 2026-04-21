import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { fmtAUD } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function CartDrawer() {
  const { items, open, setOpen, updateQty, removeItem, totals } = useCart();
  const nav = useNavigate();

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

          {items.length > 0 && (
            <div className="mt-6 p-4 border border-dashed border-chaioz-saffron/40 rounded-xl bg-chaioz-saffron/5 text-sm">
              <span className="text-chaioz-saffron font-medium">Treat yourself —</span>{" "}
              add a Pistachio Milkcake for $9.95.
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
