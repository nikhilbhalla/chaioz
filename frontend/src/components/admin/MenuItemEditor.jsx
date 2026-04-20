import { useEffect, useRef, useState } from "react";
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
import { Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const CATEGORIES = ["Hot Drinks", "Cold Drinks", "Breakfast", "All Day Eats", "Street Food", "Desserts"];

const empty = {
  name: "",
  description: "",
  price: "",
  category: "Hot Drinks",
  subcategory: "",
  image: "",
  calories: "",
  is_bestseller: false,
  is_vegan: false,
  is_available: true,
};

export default function MenuItemEditor({ open, onClose, item, onSaved }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const isEdit = !!item;

  useEffect(() => {
    if (item) setForm({ ...empty, ...item, price: String(item.price) });
    else setForm(empty);
  }, [item, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target ? e.target.value : e }));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/uploads/image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const fullUrl = `${process.env.REACT_APP_BACKEND_URL}${data.url}`;
      setForm((f) => ({ ...f, image: fullUrl }));
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.price || !form.category) {
      toast.error("Name, price, category are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        price: parseFloat(form.price),
        sort_order: form.sort_order || 999,
      };
      if (isEdit) {
        await api.put(`/admin/menu/${item.id}`, body);
        toast.success("Item updated");
      } else {
        await api.post("/admin/menu", body);
        toast.success("Item created");
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
      <DialogContent className="bg-chaioz-deep border-chaioz-line text-chaioz-cream max-w-2xl" data-testid="menu-editor-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl">{isEdit ? "Edit menu item" : "New menu item"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-[200px_1fr] gap-5 max-h-[65vh] overflow-y-auto pr-2">
          {/* Image */}
          <div>
            <Label className="text-chaioz-cream/80 text-xs uppercase tracking-widest">Image</Label>
            <div className="mt-2 aspect-square rounded-xl bg-chaioz-ink border border-chaioz-line overflow-hidden relative flex items-center justify-center">
              {form.image ? (
                <img src={form.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-chaioz-cream/30" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="menu-image-input" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              data-testid="menu-upload-btn"
              className="w-full mt-2 bg-transparent border-chaioz-line text-chaioz-cream hover:text-chaioz-saffron rounded-full"
            >
              {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
              {uploading ? "Uploading..." : "Upload image"}
            </Button>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-chaioz-cream/80">Name</Label>
                <Input value={form.name} onChange={set("name")} data-testid="menu-name" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-cream/80">Price ($)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={set("price")} data-testid="menu-price" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-cream/80">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="menu-category" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-chaioz-deep border-chaioz-line text-chaioz-cream">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-chaioz-cream/80">Subcategory</Label>
                <Input value={form.subcategory || ""} onChange={set("subcategory")} data-testid="menu-subcategory" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-cream/80">Calories</Label>
                <Input value={form.calories || ""} onChange={set("calories")} data-testid="menu-calories" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1" placeholder="e.g. 420 kcal" />
              </div>
            </div>
            <div>
              <Label className="text-chaioz-cream/80">Description</Label>
              <Textarea value={form.description} onChange={set("description")} data-testid="menu-description" className="bg-chaioz-ink border-chaioz-line text-chaioz-cream mt-1" />
            </div>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_bestseller} onCheckedChange={(v) => setForm((f) => ({ ...f, is_bestseller: !!v }))} data-testid="menu-bestseller" />
                Bestseller
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_vegan} onCheckedChange={(v) => setForm((f) => ({ ...f, is_vegan: !!v }))} data-testid="menu-vegan" />
                Vegan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_available} onCheckedChange={(v) => setForm((f) => ({ ...f, is_available: !!v }))} data-testid="menu-available" />
                Available
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-chaioz-line">
          <Button variant="outline" onClick={onClose} data-testid="menu-cancel" className="rounded-full bg-transparent border-chaioz-line text-chaioz-cream hover:text-chaioz-saffron">Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="menu-save" className="rounded-full bg-chaioz-saffron text-chaioz-ink hover:bg-chaioz-saffronHover hover:text-chaioz-ink">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
