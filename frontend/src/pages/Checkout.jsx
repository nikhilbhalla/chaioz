import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { api, fmtAUD, formatApiError } from "@/lib/api";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

function pickupSlots() {
  const out = [];
  const now = new Date();
  for (let m = 15; m <= 120; m += 15) {
    const t = new Date(now.getTime() + m * 60000);
    out.push({
      iso: t.toISOString(),
      label: t.toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" }) + ` (in ${m}m)`,
    });
  }
  return out;
}

export default function Checkout() {
  const { items, totals, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [payment, setPayment] = useState("square_mock");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const slots = pickupSlots();

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (!pickup && slots[0]) setPickup(slots[0].iso);
  }, [slots, pickup]);

  const submit = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!name || !phone) {
      toast.error("Please add your name and phone");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({
          item_id: i.item_id,
          name: i.name,
          price: i.price,
          qty: i.qty,
          size: i.size,
          addons: i.addons,
          notes: i.notes,
          line_total: i.line_total,
        })),
        pickup_time: pickup,
        customer_name: name,
        customer_phone: phone,
        notes,
        payment_method: payment,
      };
      const { data } = await api.post("/orders", payload);
      setDone(data);
      clear();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const pickupLocal = new Date(done.pickup_time).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    return (
      <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 sm:px-8 text-center" data-testid="order-confirmation">
        <CheckCircle className="w-16 h-16 text-chaioz-saffron mx-auto mb-6" />
        <h1 className="font-serif text-5xl text-chaioz-cream">Chai's brewing.</h1>
        <p className="text-chaioz-cream/70 mt-4">
          Order <span className="text-chaioz-saffron font-medium" data-testid="order-code">#{done.short_code}</span> is in the pan.
        </p>
        <div className="border border-chaioz-line bg-chaioz-deep rounded-2xl p-6 mt-8 inline-block text-left">
          <p className="text-sm text-chaioz-cream/70">Pickup at</p>
          <p className="font-serif text-3xl text-chaioz-cream mt-1">{pickupLocal}</p>
          <p className="text-sm text-chaioz-cream/70 mt-3">Total: <span className="text-chaioz-saffron">{fmtAUD(done.total)}</span></p>
          {done.points_earned > 0 && (
            <p className="text-xs text-chaioz-saffron mt-2">+{done.points_earned} loyalty points earned</p>
          )}
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Button onClick={() => nav("/menu")} data-testid="confirmation-order-more" className="bg-chaioz-saffron text-chaioz-ink hover:bg-chaioz-saffronHover hover:text-chaioz-ink rounded-full">Order more</Button>
          <Button variant="outline" onClick={() => nav("/account")} className="rounded-full bg-transparent border-chaioz-line text-chaioz-cream hover:text-chaioz-saffron">View orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-5xl mx-auto px-6 sm:px-8" data-testid="checkout-page">
      <h1 className="font-serif text-5xl text-chaioz-cream mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-6">
          <div className="border border-chaioz-line rounded-2xl bg-chaioz-deep p-6 space-y-5">
            <h2 className="font-serif text-2xl text-chaioz-cream">Pickup details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-chaioz-cream/80">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="checkout-name" className="mt-1 bg-chaioz-ink border-chaioz-line text-chaioz-cream" />
              </div>
              <div>
                <Label className="text-chaioz-cream/80">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="checkout-phone" className="mt-1 bg-chaioz-ink border-chaioz-line text-chaioz-cream" placeholder="0412 345 678"/>
              </div>
            </div>
            <div>
              <Label className="text-chaioz-cream/80 flex items-center gap-2"><Clock className="w-4 h-4 text-chaioz-saffron"/> Pickup time</Label>
              <Select value={pickup} onValueChange={setPickup}>
                <SelectTrigger data-testid="checkout-pickup-time" className="mt-1 bg-chaioz-ink border-chaioz-line text-chaioz-cream">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-chaioz-deep border-chaioz-line text-chaioz-cream max-h-72">
                  {slots.map((s) => (
                    <SelectItem key={s.iso} value={s.iso}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-chaioz-cream/80">Order notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="checkout-notes" className="mt-1 bg-chaioz-ink border-chaioz-line text-chaioz-cream" />
            </div>
          </div>

          <div className="border border-chaioz-line rounded-2xl bg-chaioz-deep p-6 space-y-4">
            <h2 className="font-serif text-2xl text-chaioz-cream">Payment</h2>
            <p className="text-xs text-chaioz-cream/60 leading-relaxed">
              <ShieldCheck className="w-4 h-4 inline -mt-0.5 mr-1 text-chaioz-saffron" />
              Square checkout (sandbox / mock). No real charge will be made until live Square keys are connected.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setPayment("square_mock")}
                data-testid="payment-square"
                className={`text-left border rounded-xl p-4 ${payment === "square_mock" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}
              >
                <p className="font-medium text-chaioz-cream">Card (Square)</p>
                <p className="text-xs text-chaioz-cream/60 mt-1">Pay now via Square</p>
              </button>
              <button
                onClick={() => setPayment("pay_at_pickup")}
                data-testid="payment-pickup"
                className={`text-left border rounded-xl p-4 ${payment === "pay_at_pickup" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}
              >
                <p className="font-medium text-chaioz-cream">Pay at pickup</p>
                <p className="text-xs text-chaioz-cream/60 mt-1">Tap or cash on collection</p>
              </button>
            </div>
          </div>
        </div>

        <aside className="border border-chaioz-line rounded-2xl bg-chaioz-deep p-6 h-fit lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl text-chaioz-cream mb-4">Your order</h2>
          {items.length === 0 ? (
            <p className="text-chaioz-cream/60 text-sm">Cart is empty.</p>
          ) : (
            <>
              <ul className="divide-y divide-chaioz-line">
                {items.map((it) => (
                  <li key={it._key} className="py-3 flex justify-between text-sm">
                    <span className="text-chaioz-cream/90">{it.qty} × {it.name}</span>
                    <span className="text-chaioz-cream">{fmtAUD(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-chaioz-line mt-4 pt-4 flex justify-between text-base">
                <span className="text-chaioz-cream/80">Total</span>
                <span className="text-chaioz-saffron font-medium" data-testid="checkout-total">{fmtAUD(totals.subtotal)}</span>
              </div>
              <Button
                onClick={submit}
                disabled={submitting}
                data-testid="checkout-place-order"
                className="w-full mt-5 bg-chaioz-saffron text-chaioz-ink hover:bg-chaioz-saffronHover hover:text-chaioz-ink rounded-full h-12"
              >
                {submitting ? "Placing..." : `Place order • ${fmtAUD(totals.subtotal)}`}
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
