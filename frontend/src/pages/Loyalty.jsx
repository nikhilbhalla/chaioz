import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { QrCode, Smartphone, Award, Coffee, Gift, Users } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const TIERS = [
  { name: "Bronze", min: 0, perks: ["1 pt per $0.10 spent", "Birthday treat"] },
  { name: "Silver", min: 800, perks: ["10% bonus points", "Exclusive event invites"] },
  { name: "Gold", min: 2000, perks: ["Free chai every 5 orders", "App-only menu items", "Skip-the-queue"] },
];

export default function Loyalty() {
  const { user } = useAuth();
  const pts = user?.loyalty_points || 0;
  const currentTier = TIERS.slice().reverse().find((t) => pts >= t.min) || TIERS[0];
  const nextTier = TIERS.find((t) => t.min > pts);
  const progress = nextTier ? Math.min(100, ((pts - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  return (
    <div className="pt-28 pb-24 max-w-6xl mx-auto px-6 sm:px-8" data-testid="loyalty-page">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Chaioz Rewards</span>
        <h1 className="font-serif text-5xl md:text-7xl text-chaioz-cream mt-3 leading-tight">
          Earn chai. <span className="italic text-chaioz-saffron">Skip the queue.</span>
        </h1>
        <p className="text-chaioz-cream/70 mt-5 text-lg">
          Sip more, save more. Get rewards, exclusive offers, and 10% off your next order — straight in our app.
        </p>
        <div className="flex justify-center gap-3 mt-8">
          {!user ? (
            <Link to="/signup" data-testid="loyalty-signup-cta">
              <Button className="bg-chaioz-saffron text-chaioz-ink hover:bg-chaioz-saffronHover hover:text-chaioz-ink rounded-full h-12 px-6">
                Join — get 10% off
              </Button>
            </Link>
          ) : (
            <Link to="/menu">
              <Button className="bg-chaioz-saffron text-chaioz-ink hover:bg-chaioz-saffronHover hover:text-chaioz-ink rounded-full h-12 px-6" data-testid="loyalty-order-cta">
                Order now
              </Button>
            </Link>
          )}
          <Button variant="outline" className="rounded-full h-12 px-6 bg-transparent border-chaioz-cream/30 text-chaioz-cream hover:bg-chaioz-cream/10 hover:text-chaioz-saffron" data-testid="loyalty-app-store">
            <Smartphone className="w-4 h-4 mr-2" /> App Store
          </Button>
        </div>
      </section>

      {/* User progress (if logged in) */}
      {user && (
        <section className="mt-14 border border-chaioz-line bg-chaioz-deep rounded-3xl p-8 grain relative overflow-hidden" data-testid="loyalty-progress">
          <div className="relative z-10 flex flex-wrap justify-between items-end gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-chaioz-cream/60">Hi {user.name.split(" ")[0]} —</p>
              <p className="font-serif text-5xl text-chaioz-cream mt-2">{pts} <span className="text-base text-chaioz-cream/60">pts</span></p>
              <p className="text-sm text-chaioz-saffron mt-1 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4" /> {currentTier.name} Tier
              </p>
            </div>
            <div className="flex-1 min-w-[260px] max-w-md">
              <div className="flex justify-between text-xs text-chaioz-cream/60 mb-2">
                <span>{currentTier.name}</span>
                <span>{nextTier ? nextTier.name : "Maxed"}</span>
              </div>
              <Progress value={progress} className="h-2 bg-chaioz-line [&>div]:bg-chaioz-saffron" />
              {nextTier && (
                <p className="text-xs text-chaioz-cream/60 mt-2">
                  {nextTier.min - pts} pts to <span className="text-chaioz-saffron">{nextTier.name}</span>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Tiers */}
      <section className="mt-16 grid md:grid-cols-3 gap-5">
        {TIERS.map((t, i) => (
          <div
            key={t.name}
            data-testid={`tier-${t.name.toLowerCase()}`}
            className={`border rounded-2xl p-6 ${
              currentTier?.name === t.name ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line bg-chaioz-deep"
            }`}
          >
            <Award className={`w-7 h-7 mb-3 ${i === 0 ? "text-amber-700" : i === 1 ? "text-zinc-300" : "text-chaioz-saffron"}`} />
            <h3 className="font-serif text-2xl text-chaioz-cream">{t.name}</h3>
            <p className="text-xs text-chaioz-cream/60 mt-1">From {t.min} pts</p>
            <ul className="mt-4 space-y-2 text-sm text-chaioz-cream/80">
              {t.perks.map((p) => (
                <li key={p} className="flex gap-2">
                  <span className="text-chaioz-saffron">✦</span> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* App banner */}
      <section className="mt-16 border border-chaioz-line bg-chaioz-teal/30 rounded-3xl p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center grain relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-serif text-4xl text-chaioz-cream">Your chai. In your pocket.</h2>
          <p className="text-chaioz-cream/80 mt-3 max-w-md">
            One-click reorder, push notifications when your favourite drop is ready, and app-only hidden menu items.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
            <div className="text-center text-chaioz-cream/80 text-xs">
              <Coffee className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> 1-click reorder
            </div>
            <div className="text-center text-chaioz-cream/80 text-xs">
              <Gift className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> Hidden menu
            </div>
            <div className="text-center text-chaioz-cream/80 text-xs">
              <Users className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> Refer & earn $5
            </div>
          </div>
        </div>
        <div className="bg-chaioz-cream p-4 rounded-2xl mx-auto">
          <QrCode className="w-32 h-32 text-chaioz-ink" />
          <p className="text-xs text-chaioz-ink text-center mt-2 font-medium">Scan to download</p>
        </div>
      </section>
    </div>
  );
}
