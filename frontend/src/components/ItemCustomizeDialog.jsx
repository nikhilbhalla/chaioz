import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus } from "lucide-react";
import { fmtAUD } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export default function ItemCustomizeDialog({ item, open, onClose }) {
  const { addItem } = useCart();
  const [size, setSize] = useState("");
  const [addons, setAddons] = useState([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (item) {
      setSize(item.sizes?.[0]?.name || "");
      setAddons([]);
      setQty(1);
      setNotes("");
    }
  }, [item]);

  if (!item) return null;

  const sizeDelta = item.sizes?.find((s) => s.name === size)?.price_delta || 0;
  const addonsTotal = addons.reduce((s, name) => {
    const a = item.addons?.find((x) => x.name === name);
    return s + (a?.price || 0);
  }, 0);
  const unitPrice = Number((item.price + sizeDelta + addonsTotal).toFixed(2));
  const total = Number((unitPrice * qty).toFixed(2));

  const toggleAddon = (name) =>
    setAddons((prev) => (prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name]));

  const handleAdd = () => {
    addItem({
      item_id: item.id,
      name: item.name + (size ? ` (${size})` : ""),
      price: unitPrice,
      qty,
      size: size || null,
      addons,
      notes: notes || null,
      line_total: total,
    });
    toast.success(`${item.name} added to cart`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        data-testid="item-customize-dialog"
        className="bg-white border-chaioz-line text-chaioz-teal max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl text-chaioz-teal">{item.name}</DialogTitle>
          <DialogDescription className="text-chaioz-teal/60">{item.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-2">
          {item.sizes?.length > 0 && (
            <div>
              <h4 className="text-sm uppercase tracking-wider text-chaioz-saffron mb-3">Size</h4>
              <RadioGroup value={size} onValueChange={setSize} className="grid grid-cols-2 gap-2">
                {item.sizes.map((s) => (
                  <Label
                    key={s.name}
                    htmlFor={`size-${s.name}`}
                    className={`cursor-pointer flex items-center justify-between border rounded-lg px-4 py-3 ${
                      size === s.name ? "border-chaioz-saffron bg-chaioz-saffron/10" : "border-chaioz-line"
                    }`}
                  >
                    <span>
                      <RadioGroupItem id={`size-${s.name}`} value={s.name} className="hidden" />
                      {s.name}
                    </span>
                    <span className="text-chaioz-teal/60 text-sm">
                      {s.price_delta > 0 ? `+${fmtAUD(s.price_delta)}` : "—"}
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          )}

          {item.addons?.length > 0 && (
            <div>
              <h4 className="text-sm uppercase tracking-wider text-chaioz-saffron mb-3">Add-ons</h4>
              <div className="space-y-2">
                {item.addons.map((a) => (
                  <Label
                    key={a.name}
                    className="flex items-center justify-between border border-chaioz-line rounded-lg px-4 py-3 cursor-pointer hover:border-chaioz-saffron/40"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={addons.includes(a.name)}
                        onCheckedChange={() => toggleAddon(a.name)}
                        data-testid={`addon-${a.name}`}
                        className="border-chaioz-line"
                      />
                      <span>{a.name}</span>
                    </div>
                    <span className="text-chaioz-teal/60 text-sm">+{fmtAUD(a.price)}</span>
                  </Label>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm uppercase tracking-wider text-chaioz-saffron mb-3">Special instructions</h4>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="No sugar, extra hot..."
              className="bg-chaioz-cream border-chaioz-line text-chaioz-teal"
              data-testid="item-notes"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-chaioz-line">
          <div className="flex items-center gap-3">
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              data-testid="qty-decrement"
              className="border-chaioz-line bg-transparent text-chaioz-teal rounded-full"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span data-testid="qty-display" className="text-lg w-8 text-center">{qty}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQty((q) => q + 1)}
              data-testid="qty-increment"
              className="border-chaioz-line bg-transparent text-chaioz-teal rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={handleAdd}
            data-testid="add-to-cart-confirm"
            className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full px-6"
          >
            Add • {fmtAUD(total)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
