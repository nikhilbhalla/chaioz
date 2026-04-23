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

const CATEGORIES = ["Chai Blends", "Gift Boxes", "Merch", "Subscription"];

const empty = {
  name: "",
  description: "",
  price: "",
  category: "Chai Blends",
  image: "",
  stock: 100,
  is_subscription: false,
  sort_order: 999,
};

export default function ProductEditor({ open, onClose, product, onSaved }) {
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const isEdit = !!product;

  useEffect(() => {
    if (product) setForm({ ...empty, ...product, price: String(product.price), stock: String(product.stock ?? 100) });
    else setForm(empty);
  }, [product, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

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
        stock: parseInt(form.stock || 0, 10),
        sort_order: Number(form.sort_order) || 999,
      };
      if (isEdit) {
        await api.put(`/admin/products/${product.id}`, body);
        toast.success("Product updated");
      } else {
        await api.post("/admin/products", body);
        toast.success("Product created");
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
      <DialogContent className="bg-white border-chaioz-line text-chaioz-teal max-w-2xl" data-testid="product-editor-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl">{isEdit ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-[200px_1fr] gap-5 max-h-[65vh] overflow-y-auto pr-2">
          <div>
            <Label className="text-chaioz-teal/80 text-xs uppercase tracking-widest">Image</Label>
            <div className="mt-2 aspect-square rounded-xl bg-chaioz-cream border border-chaioz-line overflow-hidden relative flex items-center justify-center">
              {form.image ? (
                <img src={form.image} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-8 h-8 text-chaioz-teal/30" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="product-image-input" />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              data-testid="product-upload-btn"
              className="w-full mt-2 bg-transparent border-chaioz-line text-chaioz-teal hover:text-chaioz-saffron rounded-full"
            >
              {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
              {uploading ? "Uploading..." : "Upload image"}
            </Button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-chaioz-teal/80">Name</Label>
                <Input value={form.name} onChange={set("name")} data-testid="product-name" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-teal/80">Price ($)</Label>
                <Input type="number" step="0.01" value={form.price} onChange={set("price")} data-testid="product-price" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-teal/80">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger data-testid="product-category" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1"><SelectValue/></SelectTrigger>
                  <SelectContent className="bg-white border-chaioz-line text-chaioz-teal">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-chaioz-teal/80">Stock</Label>
                <Input type="number" value={form.stock} onChange={set("stock")} data-testid="product-stock" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
              </div>
              <div>
                <Label className="text-chaioz-teal/80">Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={set("sort_order")} data-testid="product-sort" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-chaioz-teal/80">Description</Label>
              <Textarea value={form.description} onChange={set("description")} data-testid="product-description" className="bg-chaioz-cream border-chaioz-line text-chaioz-teal mt-1" rows={3} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_subscription} onCheckedChange={(v) => setForm((f) => ({ ...f, is_subscription: !!v }))} data-testid="product-subscription" />
              Subscription product (monthly, recurring)
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-chaioz-line">
          <Button variant="outline" onClick={onClose} data-testid="product-cancel" className="rounded-full bg-transparent border-chaioz-line text-chaioz-teal hover:text-chaioz-saffron">Cancel</Button>
          <Button onClick={save} disabled={saving} data-testid="product-save" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
