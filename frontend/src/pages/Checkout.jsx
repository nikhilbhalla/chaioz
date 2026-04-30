import { useEffect, useMemo, useState } from "react";
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
import { CheckCircle, Clock, ShieldCheck, Truck, Store, Loader2 } from "lucide-react";
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
  const { items, totals, clear, contact, setContact } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || contact.name || "");
  const [email, setEmail] = useState(user?.email || contact.email || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState("");
  const [payment, setPayment] = useState("square_mock");
  const [fulfillment, setFulfillment] = useState("pickup");
  // Delivery fields
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("Adelaide");
  const [state, setState] = useState("SA");
  const [zip, setZip] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [pickupOnly, setPickupOnly] = useState(false);
  // Memoised so the ISO strings don't regenerate on every render — otherwise
  // the Select's `value` never matches the current slots and displays blank.
  const slots = useMemo(() => pickupSlots(), []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  // Read operational settings once on mount — when pickup_only is on we hide
  // the delivery toggle entirely and force fulfillment to pickup.
  useEffect(() => {
    api.get("/settings")
      .then((r) => {
        const po = !!r.data?.pickup_only;
        setPickupOnly(po);
        if (po) setFulfillment("pickup");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!pickup && slots[0]) setPickup(slots[0].iso);
  }, [slots, pickup]);

  // Persist contact for abandonment tracking
  useEffect(() => {
    setContact({ email, phone, name });
  }, [email, phone, name, setContact]);

  const deliveryFee = quote?.fee_aud || 0;
  const orderTotal = useMemo(
    () => Number((totals.subtotal + (fulfillment === "delivery" ? deliveryFee : 0)).toFixed(2)),
    [totals.subtotal, fulfillment, deliveryFee]
  );

  const requestQuote = async () => {
    if (!street || !zip) {
      toast.error("Please enter street and postcode");
      return;
    }
    setQuoteLoading(true);
    try {
      const { data } = await api.post("/delivery/quote", {
        street_address: [street],
        city,
        state,
        zip_code: zip,
        country: "AU",
      });
      setQuote(data);
      toast.success(`Delivery: ${fmtAUD(data.fee_aud)} · ~${Math.round((new Date(data.dropoff_eta) - Date.now()) / 60000)} min`);
    } catch (e) {
      toast.error("Couldn't get delivery quote. Try pickup instead.");
    } finally {
      setQuoteLoading(false);
    }
  };

  const submit = async () => {
    if (items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    if (!name || !phone) {
      toast.error("Please add your name and phone");
      return;
    }
    if (fulfillment === "delivery" && !quote) {
      toast.error("Please get a delivery quote first");
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
        customer_email: email || null,
        notes,
        payment_method: payment,
        fulfillment,
        delivery_address:
          fulfillment === "delivery"
            ? { street_address: [street], city, state, zip_code: zip, country: "AU" }
            : null,
        delivery_quote_id: fulfillment === "delivery" ? quote?.id : null,
        delivery_fee: fulfillment === "delivery" ? deliveryFee : 0,
        delivery_notes: fulfillment === "delivery" ? deliveryNotes : null,
      };
      const { data } = await api.post("/orders", payload);
      setDone(data);
      clear();
      if (email) api.post("/cart/recovered", { email }).catch(() => {});
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const pickupLocal = new Date(done.pickup_time).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
    const isDelivery = done.fulfillment === "delivery";
    return (
      <div className="pt-32 pb-20 max-w-3xl mx-auto px-6 sm:px-8 text-center" data-testid="order-confirmation">
        <CheckCircle className="w-16 h-16 text-chaioz-saffron mx-auto mb-6" />
        <h1 className="font-serif text-5xl text-chaioz-teal">Chai's brewing.</h1>
        <p className="text-chaioz-teal/70 mt-4">
          Order <span className="text-chaioz-saffron font-medium" data-testid="order-code">#{done.short_code}</span> is in the pan.
        </p>
        <div className="border border-chaioz-line bg-white rounded-2xl p-6 mt-8 inline-block text-left">
          <p className="text-sm text-chaioz-teal/70">{isDelivery ? "Ready for dispatch" : "Pickup at"}</p>
          <p className="font-serif text-3xl text-chaioz-teal mt-1">{pickupLocal}</p>
          <p className="text-sm text-chaioz-teal/70 mt-3">Total: <span className="text-chaioz-saffron">{fmtAUD(done.total)}</span></p>
          {done.points_earned > 0 && (
            <p className="text-xs text-chaioz-saffron mt-2">+{done.points_earned} loyalty points earned</p>
          )}
          {email && <p className="text-xs text-chaioz-teal/60 mt-2">Confirmation sent to {email}</p>}
          {isDelivery && done.uber_tracking_url && (
            <a href={done.uber_tracking_url} target="_blank" rel="noreferrer" className="inline-block text-xs text-chaioz-saffron hover:underline mt-2" data-testid="tracking-link">
              Track your delivery →
            </a>
          )}
        </div>
        <div className="mt-10 flex justify-center gap-3">
          <Button onClick={() => nav("/menu")} data-testid="confirmation-order-more" className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full">Order more</Button>
          <Button variant="outline" onClick={() => nav("/account")} className="rounded-full bg-transparent border-chaioz-line text-chaioz-teal hover:text-chaioz-saffron">View orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-28 pb-24 max-w-5xl mx-auto px-6 sm:px-8" data-testid="checkout-page">
      <h1 className="font-serif text-5xl text-chaioz-teal mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-[1fr_360px] gap-10">
        <div className="space-y-6">
          {/* Fulfillment toggle — hidden in pickup-only mode */}
          {!pickupOnly && (
            <div className="border border-chaioz-line rounded-2xl bg-white p-6 space-y-4">
              <h2 className="font-serif text-2xl text-chaioz-teal">How are we serving you?</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFulfillment("pickup")}
                  data-testid="fulfillment-pickup"
                  className={`text-left border rounded-xl p-4 ${fulfillment === "pickup" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}
                >
                  <Store className="w-5 h-5 text-chaioz-saffron mb-2" />
                  <p className="font-medium text-chaioz-teal">Pickup</p>
                  <p className="text-xs text-chaioz-teal/60 mt-1">Collect from North Adelaide</p>
                </button>
                <button
                  onClick={() => setFulfillment("delivery")}
                  data-testid="fulfillment-delivery"
                  className={`text-left border rounded-xl p-4 ${fulfillment === "delivery" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}
                >
                  <Truck className="w-5 h-5 text-chaioz-saffron mb-2" />
                  <p className="font-medium text-chaioz-teal">Uber Delivery</p>
                  <p className="text-xs text-chaioz-teal/60 mt-1">Door-to-door, ~35 min</p>
                </button>
              </div>
            </div>
          )}
          {pickupOnly && (
            <div
              data-testid="pickup-only-notice"
              className="border border-chaioz-saffron/40 bg-chaioz-saffron/10 rounded-2xl p-5 flex items-start gap-3"
            >
              <Store className="w-5 h-5 text-chaioz-saffron mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-chaioz-teal">Pickup only during soft launch</p>
                <p className="text-sm text-chaioz-teal/70 mt-1">Collect your order from Unit 2, 132 O'Connell St, North Adelaide. Delivery will be back online soon.</p>
              </div>
            </div>
          )}

          {/* Customer */}
          <div className="border border-chaioz-line rounded-2xl bg-white p-6 space-y-5">
            <h2 className="font-serif text-2xl text-chaioz-teal">Your details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-chaioz-teal/80">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="checkout-name" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
              </div>
              <div>
                <Label className="text-chaioz-teal/80">Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="checkout-phone" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" placeholder="0412 345 678"/>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-chaioz-teal/80">Email (for confirmation)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="checkout-email" type="email" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" placeholder="you@example.com" />
              </div>
            </div>
            {fulfillment === "pickup" && (
              <div>
                <Label className="text-chaioz-teal/80 flex items-center gap-2"><Clock className="w-4 h-4 text-chaioz-saffron"/> Pickup time</Label>
                <Select value={pickup} onValueChange={setPickup}>
                  <SelectTrigger data-testid="checkout-pickup-time" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-chaioz-line text-chaioz-teal max-h-72">
                    {slots.map((s) => (
                      <SelectItem key={s.iso} value={s.iso}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-chaioz-teal/80">Order notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="checkout-notes" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
            </div>
          </div>

          {/* Delivery address */}
          {fulfillment === "delivery" && (
            <div className="border border-chaioz-line rounded-2xl bg-white p-6 space-y-4" data-testid="delivery-address-section">
              <h2 className="font-serif text-2xl text-chaioz-teal">Delivery address</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-chaioz-teal/80">Street</Label>
                  <Input value={street} onChange={(e) => setStreet(e.target.value)} data-testid="delivery-street" placeholder="12/34 Example Ave" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
                </div>
                <div>
                  <Label className="text-chaioz-teal/80">Suburb</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} data-testid="delivery-city" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
                </div>
                <div>
                  <Label className="text-chaioz-teal/80">Postcode</Label>
                  <Input value={zip} onChange={(e) => setZip(e.target.value)} data-testid="delivery-zip" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-chaioz-teal/80">Delivery notes (optional)</Label>
                  <Input value={deliveryNotes} onChange={(e) => setDeliveryNotes(e.target.value)} data-testid="delivery-notes" placeholder="Leave at door, ring buzzer 3..." className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
                </div>
              </div>
              <Button
                onClick={requestQuote}
                variant="outline"
                disabled={quoteLoading}
                data-testid="get-delivery-quote"
                className="w-full rounded-full bg-transparent border-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffron hover:text-chaioz-teal"
              >
                {quoteLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Truck className="w-4 h-4 mr-2" />}
                {quote ? `Quote: ${fmtAUD(quote.fee_aud)} · update` : "Get delivery quote"}
              </Button>
              {quote?.mock && (
                <p className="text-xs text-chaioz-teal/50 text-center">Using estimated quote. Live Uber Direct will kick in once credentials are connected.</p>
              )}
            </div>
          )}

          {/* Payment */}
          <div className="border border-chaioz-line rounded-2xl bg-white p-6 space-y-4">
            <h2 className="font-serif text-2xl text-chaioz-teal">Payment</h2>
            <p className="text-xs text-chaioz-teal/60 leading-relaxed">
              <ShieldCheck className="w-4 h-4 inline -mt-0.5 mr-1 text-chaioz-saffron" />
              Square checkout (sandbox / mock). No real charge will be made until live Square keys are connected.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => setPayment("square_mock")} data-testid="payment-square" className={`text-left border rounded-xl p-4 ${payment === "square_mock" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}>
                <p className="font-medium text-chaioz-teal">Card (Square)</p>
                <p className="text-xs text-chaioz-teal/60 mt-1">Pay now via Square</p>
              </button>
              <button onClick={() => setPayment("pay_at_pickup")} data-testid="payment-pickup" className={`text-left border rounded-xl p-4 ${payment === "pay_at_pickup" ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line"}`}>
                <p className="font-medium text-chaioz-teal">Pay at {fulfillment === "delivery" ? "delivery" : "pickup"}</p>
                <p className="text-xs text-chaioz-teal/60 mt-1">Tap or cash on collection</p>
              </button>
            </div>
          </div>
        </div>

        {/* Summary */}
        <aside className="border border-chaioz-line rounded-2xl bg-white p-6 h-fit lg:sticky lg:top-28">
          <h2 className="font-serif text-2xl text-chaioz-teal mb-4">Your order</h2>
          {items.length === 0 ? (
            <p className="text-chaioz-teal/60 text-sm">Cart is empty.</p>
          ) : (
            <>
              <ul className="divide-y divide-chaioz-line">
                {items.map((it) => (
                  <li key={it._key} className="py-3 flex justify-between text-sm">
                    <span className="text-chaioz-teal/90">{it.qty} × {it.name}</span>
                    <span className="text-chaioz-teal">{fmtAUD(it.line_total)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-chaioz-line mt-4 pt-3 space-y-1 text-sm text-chaioz-teal/80">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmtAUD(totals.subtotal)}</span></div>
                {fulfillment === "delivery" && (
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{quote ? fmtAUD(deliveryFee) : "—"}</span>
                  </div>
                )}
                <div className="flex justify-between text-base pt-2 border-t border-chaioz-line mt-2">
                  <span className="text-chaioz-teal">Total</span>
                  <span className="text-chaioz-saffron font-medium" data-testid="checkout-total">{fmtAUD(orderTotal)}</span>
                </div>
              </div>
              <Button
                onClick={submit}
                disabled={submitting}
                data-testid="checkout-place-order"
                className="w-full mt-5 bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-12"
              >
                {submitting ? "Placing..." : `Place order • ${fmtAUD(orderTotal)}`}
              </Button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
