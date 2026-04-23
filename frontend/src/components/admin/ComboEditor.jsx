import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Plus, Check } from "lucide-react";
import { api, fmtAUD } from "@/lib/api";
import { toast } from "sonner";

const ICONS = ["sunrise", "moon", "sparkles", "sun", "star", "flame"];

const emptyCombo = {
  name: "",
  tagline: "",
  items: [],
  bundle_price: "",
  badge: "",
  icon: "sparkles",
  is_active: true,
  sort_order: 999,
};

export default function ComboEditor({ open, onClose, combo, onSaved, menuItems }) {
  const [form, setForm] = useState(emptyCombo);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const isEdit = !!combo;

  useEffect(() => {
    if (combo) setForm({ ...emptyCombo, ...combo, bundle_price: String(combo.bundle_price) });
    else setForm(emptyCombo);
    setItemSearch("");
  }, [combo, open]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  const originalPrice = useMemo(() => {
    const byName = Object.fromEntries(menuItems.map((m) => [m.name, m]));
    return form.items.reduce((s, n) => s + (byName[n]?.price || 0), 0);
  }, [form.items, menuItems]);

  const parsedBundle = parseFloat(form.bundle_price) || 0;
  const save = Math.max(0, +(originalPrice - parsedBundle).toFixed(2));

  const addItem = (name) => {
    if (form.items.includes(name)) return;
    setForm((f) => ({ ...f, items: [...f.items, name] }));
    setItemSearch("");
  };
  const removeItem = (name) => setForm((f) => ({ ...f, items: f.items.filter((i) => i !== name) }));

  const searchResults = useMemo(() => {
    if (!itemSearch) return [];
    const q = itemSearch.toLowerCase();
    return menuItems.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 6);
  }, [itemSearch, menuItems]);

  const onSave = async () => {
    if (!form.name || form.items.length < 2 || !form.bundle_price) {
      toast.error("Name, at least 2 items, and bundle price are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        bundle_price: parsedBundle,
        sort_order: Number(form.sort_order) || 999,
      };
      if (isEdit) {
        await api.put(`/admin/combos/${combo.id}`, body);
        toast.success("Combo updated");
      } else {
        await api.post("/admin/combos", body);
        toast.success("Combo created");
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-chaioz-line text-chaioz-teal max-w-2xl" data-testid="combo-editor-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl">
            {isEdit ? "Edit combo" : "New combo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-chaioz-teal/80">Name</Label>
              <Input value={form.name} onChange={set("name")} data-testid="combo-name" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-chaioz-teal/80">Tagline</Label>
              <Input value={form.tagline || ""} onChange={set("tagline")} data-testid="combo-tagline" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" placeholder="e.g. Wrap + hashbrown + chai" />
            </div>
            <div>
              <Label className="text-chaioz-teal/80">Bundle price ($)</Label>
              <Input type="number" step="0.01" value={form.bundle_price} onChange={set("bundle_price")} data-testid="combo-price" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
            </div>
            <div>
              <Label className="text-chaioz-teal/80">Badge</Label>
              <Input value={form.badge || ""} onChange={set("badge")} data-testid="combo-badge" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" placeholder="e.g. Most popular" />
            </div>
            <div>
              <Label className="text-chaioz-teal/80">Icon</Label>
              <Select value={form.icon} onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}>
                <SelectTrigger data-testid="combo-icon" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1"><SelectValue/></SelectTrigger>
                <SelectContent className="bg-white border-chaioz-line text-chaioz-teal">
                  {ICONS.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-chaioz-teal/80">Sort order</Label>
              <Input type="number" value={form.sort_order} onChange={set("sort_order")} data-testid="combo-sort" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
            </div>
          </div>

          <div>
            <Label className="text-chaioz-teal/80">Items in combo ({form.items.length})</Label>
            <div className="mt-2 flex flex-wrap gap-2 min-h-[42px] p-2 rounded-xl border border-chaioz-line bg-chaioz-cream">
              {form.items.length === 0 && (
                <span className="text-xs text-chaioz-teal/40 px-1 py-1">Search + add menu items below…</span>
              )}
              {form.items.map((n) => (
                <span key={n} data-testid={`combo-item-${n}`} className="inline-flex items-center gap-1 bg-chaioz-saffron/20 text-chaioz-teal px-2.5 py-1 rounded-full text-xs border border-chaioz-saffron/40">
                  {n}
                  <button onClick={() => removeItem(n)} data-testid={`combo-item-remove-${n}`} className="hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="relative mt-2">
              <Input
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search menu items…"
                data-testid="combo-item-search"
                className="bg-chaioz-cream border-chaioz-line text-chaioz-teal"
              />
              {searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-chaioz-line rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {searchResults.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addItem(m.name)}
                      data-testid={`combo-item-suggest-${m.id}`}
                      className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-chaioz-cream text-sm border-b border-chaioz-line/50 last:border-b-0"
                    >
                      <span>{m.name}</span>
                      <span className="flex items-center gap-2 text-xs text-chaioz-teal/60">
                        {fmtAUD(m.price)}
                        {form.items.includes(m.name) && <Check className="w-3.5 h-3.5 text-chaioz-saffron" />}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {form.items.length > 0 && (
            <div className="grid grid-cols-3 gap-3 text-sm bg-chaioz-cream/50 rounded-xl p-3 border border-chaioz-line">
              <div>
                <p className="text-xs uppercase tracking-wider text-chaioz-teal/60">Original</p>
                <p className="font-medium line-through text-chaioz-teal/70">{fmtAUD(originalPrice)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-chaioz-teal/60">Bundle</p>
                <p className="font-medium text-chaioz-teal">{fmtAUD(parsedBundle)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-chaioz-saffron">Save</p>
                <p className="font-medium text-chaioz-saffron">{fmtAUD(save)}</p>
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: !!v }))} data-testid="combo-active" />
            Active (shown on website)
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-chaioz-line">
          <Button variant="outline" onClick={onClose} data-testid="combo-cancel" className="rounded-full bg-transparent border-chaioz-line text-chaioz-teal hover:text-chaioz-saffron">Cancel</Button>
          <Button onClick={onSave} disabled={saving} data-testid="combo-save" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create combo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
