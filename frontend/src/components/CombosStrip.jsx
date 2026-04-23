import { useEffect, useState } from "react";
import { api, fmtAUD } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { Sunrise, Moon, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ICONS = { sunrise: Sunrise, moon: Moon, sparkles: Sparkles };

export default function CombosStrip({ highlight }) {
  const [combos, setCombos] = useState([]);
  const { addItem } = useCart();

  useEffect(() => {
    api.get("/menu/combos").then((r) => setCombos(r.data || [])).catch(() => {});
  }, []);

  const addCombo = (combo) => {
    // Add each item at its full price, then apply the combo discount as a synthetic line
    // to match the displayed bundle price.
    const savingsPerItem = combo.save_aud / (combo.items_detail?.length || 1);
    combo.items_detail?.forEach((it) => {
      const unit = Number((it.price - savingsPerItem).toFixed(2));
      addItem({
        item_id: it.id,
        name: `${it.name} · ${combo.name}`,
        price: unit,
        qty: 1,
        size: null,
        addons: [],
        notes: `Part of ${combo.name} bundle`,
        line_total: unit,
      });
    });
    toast.success(`${combo.name} added — you saved ${fmtAUD(combo.save_aud)}`);
  };

  if (combos.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12" data-testid="combos-strip">
      <div className="flex items-end justify-between mb-6">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Smart combos</span>
          <h2 className="font-serif text-3xl md:text-4xl text-chaioz-teal mt-2">Save more, sip more.</h2>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {combos.map((c) => {
          const Icon = ICONS[c.icon] || Sparkles;
          const isHighlight = highlight === c.id;
          return (
            <div
              key={c.id}
              data-testid={`combo-${c.id}`}
              className={`relative bg-white border rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg ${
                isHighlight ? "border-chaioz-saffron ring-2 ring-chaioz-saffron/30" : "border-chaioz-line"
              }`}
            >
              {c.badge && (
                <span className="absolute -top-3 left-6 bg-chaioz-saffron text-chaioz-teal text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                  {c.badge}
                </span>
              )}
              <Icon className="w-6 h-6 text-chaioz-saffron mb-3" />
              <h3 className="font-serif text-2xl text-chaioz-teal">{c.name}</h3>
              <p className="text-sm text-chaioz-teal/65 mt-1">{c.tagline}</p>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-medium text-2xl text-chaioz-teal">{fmtAUD(c.bundle_price)}</span>
                {c.save_aud > 0 && (
                  <>
                    <span className="text-sm text-chaioz-teal/45 line-through">{fmtAUD(c.original_price)}</span>
                    <span className="ml-auto text-xs uppercase font-bold tracking-wider text-chaioz-saffron bg-chaioz-saffron/15 px-2 py-1 rounded-full">
                      save {fmtAUD(c.save_aud)}
                    </span>
                  </>
                )}
              </div>
              <Button
                size="sm"
                onClick={() => addCombo(c)}
                data-testid={`combo-add-${c.id}`}
                className="mt-5 rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal"
              >
                <Plus className="w-4 h-4 mr-1" /> Add combo
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
