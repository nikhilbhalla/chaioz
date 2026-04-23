import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fmtAUD } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Coffee, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function WelcomeBack() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [usual, setUsual] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    api
      .get("/orders/usual")
      .then((r) => setUsual(r.data?.has_usual ? r.data : null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user || loading || !usual?.item) return null;

  const it = usual.item;
  const addUsual = () => {
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
    toast.success(`${it.name} added — the usual 😊`);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 sm:px-8 pt-8" data-testid="welcome-back">
      <div className="relative overflow-hidden bg-white border border-chaioz-saffron/30 rounded-2xl p-5 md:p-6 flex flex-wrap items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-chaioz-saffron/15 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-6 h-6 text-chaioz-saffron" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs uppercase tracking-widest text-chaioz-saffron">Welcome back, {user.name.split(" ")[0]} 👋</p>
          <p className="font-serif text-xl md:text-2xl text-chaioz-teal mt-1">
            Your usual? <span className="italic">{it.name}</span>
            <span className="text-chaioz-teal/60 text-base not-italic"> · {fmtAUD(it.price)}</span>
          </p>
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            onClick={addUsual}
            data-testid="welcome-add-usual"
            className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal"
          >
            <Coffee className="w-4 h-4 mr-1.5" /> Add to cart
          </Button>
          <Link to="/account" data-testid="welcome-see-orders">
            <Button variant="outline" className="rounded-full bg-transparent border-chaioz-line text-chaioz-teal hover:bg-chaioz-tealSoft">
              See past orders
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
