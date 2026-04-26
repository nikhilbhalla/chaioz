import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { QrCode, Smartphone, Award, Coffee, Gift, Users, Sparkles, Phone, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import { toast } from "sonner";

// Membership "ladder" tiers — separate concept from the Square Loyalty
// reward tiers below. These reward repeat customers with perks at the
// café, not point redemptions.
const MEMBERSHIP_TIERS = [
  { name: "Bronze", min: 0, perks: ["1 pt per $1 spent", "Birthday treat"] },
  { name: "Silver", min: 800, perks: ["10% bonus points", "Exclusive event invites"] },
  { name: "Gold", min: 2000, perks: ["Free chai every 5 orders", "App-only menu items", "Skip-the-queue"] },
];

const FALLBACK_TIERS = [
  { id: "local-100", name: "Free chai", points: 100 },
  { id: "local-200", name: "$5 off", points: 200 },
];

export default function Loyalty() {
  const { user } = useAuth();
  const [loyalty, setLoyalty] = useState(null);
  const [program, setProgram] = useState({ tiers: FALLBACK_TIERS, accrual: "1 pt per $1" });
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    api.get("/loyalty/program").then((r) => setProgram(r.data || program)).catch(() => {});
    if (user) {
      api.get("/loyalty/me").then((r) => setLoyalty(r.data)).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const balance = loyalty?.balance ?? user?.loyalty_points ?? 0;
  const currentTier = MEMBERSHIP_TIERS.slice().reverse().find((t) => balance >= t.min) || MEMBERSHIP_TIERS[0];
  const nextTier = MEMBERSHIP_TIERS.find((t) => t.min > balance);
  const progress = nextTier ? Math.min(100, ((balance - currentTier.min) / (nextTier.min - currentTier.min)) * 100) : 100;

  const tiers = loyalty?.tiers && loyalty.tiers.length > 0
    ? loyalty.tiers
    : program?.tiers || [];

  const handleRedeem = async (tier) => {
    if (!loyalty?.account_id) {
      toast.error("Square Loyalty isn't connected for your account yet — add a phone number on your next order.");
      return;
    }
    if (balance < tier.points) {
      toast.error(`You need ${tier.points - balance} more points`);
      return;
    }
    setRedeeming(tier.id || tier.points);
    try {
      await api.post("/loyalty/redeem", { reward_tier_id: tier.id });
      toast.success(`Reward unlocked — ${tier.name || `${tier.points} pts`}. Show this at the counter.`);
      const fresh = await api.get("/loyalty/me");
      setLoyalty(fresh.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Couldn't redeem — try again");
    } finally {
      setRedeeming(null);
    }
  };

  return (
    <div className="pt-28 pb-24 max-w-6xl mx-auto px-6 sm:px-8" data-testid="loyalty-page">
      {/* Hero */}
      <section className="text-center max-w-3xl mx-auto">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Chaioz Rewards</span>
        <h1 className="font-serif text-5xl md:text-7xl text-chaioz-teal mt-3 leading-tight">
          Earn chai. <span className="italic text-chaioz-saffron">Skip the queue.</span>
        </h1>
        <p className="text-chaioz-teal/70 mt-5 text-lg">
          Earn 1 point for every $1 spent. Cash in for free chai or money off — synced with the Chaioz till in real time.
        </p>
        <div className="flex justify-center gap-3 mt-8 flex-wrap">
          {!user ? (
            <Link to="/signup" data-testid="loyalty-signup-cta">
              <Button className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-12 px-6">
                Join — get 100 bonus pts
              </Button>
            </Link>
          ) : (
            <Link to="/menu">
              <Button className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-12 px-6" data-testid="loyalty-order-cta">
                Order now
              </Button>
            </Link>
          )}
          <Button variant="outline" className="rounded-full h-12 px-6 bg-transparent border-chaioz-line text-chaioz-teal hover:bg-chaioz-tealSoft hover:text-chaioz-saffron" data-testid="loyalty-app-store">
            <Smartphone className="w-4 h-4 mr-2" /> App Store
          </Button>
        </div>
      </section>

      {/* ----- Square Loyalty rewards (real reward tiers) ----- */}
      {tiers.length > 0 && (
        <section className="mt-14 border border-chaioz-line bg-white rounded-3xl p-8" data-testid="loyalty-rewards-card">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-chaioz-saffron/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-chaioz-saffron" />
              </div>
              <div>
                <p className="font-serif text-2xl text-chaioz-teal">Available rewards</p>
                <p className="text-xs text-chaioz-teal/60">{program?.accrual || "1 pt per $1"}{loyalty?.configured ? " · synced with Square" : ""}</p>
              </div>
            </div>
            {user && (
              <div className="text-right">
                <p className="text-xs uppercase tracking-widest text-chaioz-teal/60">Available points</p>
                <p className="font-serif text-3xl text-chaioz-saffron" data-testid="loyalty-balance">{balance}</p>
              </div>
            )}
          </div>

          {user && loyalty?.needs_phone && (
            <div className="flex items-center gap-2 text-sm text-chaioz-teal/70 bg-chaioz-cream rounded-xl px-4 py-3 mb-4" data-testid="loyalty-needs-phone">
              <Phone className="w-4 h-4 text-chaioz-saffron" />
              Add a mobile number on checkout (or in your account) to start earning Square Loyalty points.
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3" data-testid="loyalty-tiers">
            {tiers.map((t) => {
              const pts = t.points || 0;
              const ok = user && balance >= pts;
              const busy = redeeming === (t.id || pts);
              return (
                <div key={t.id || t.name || pts} className="border border-chaioz-line rounded-2xl p-5 flex items-center justify-between" data-testid={`reward-tier-${pts}`}>
                  <div>
                    <p className="font-medium text-chaioz-teal text-base">{t.name || `${pts} pts reward`}</p>
                    <p className="text-xs text-chaioz-teal/60 mt-0.5">{pts} points</p>
                  </div>
                  {!user ? (
                    <Link to="/signup">
                      <Button size="sm" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
                        Sign up to earn
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleRedeem(t)}
                      disabled={!ok || busy || !loyalty?.account_id}
                      className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-40"
                      data-testid={`reward-redeem-${pts}`}
                    >
                      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : ok ? "Redeem" : `${pts - balance} to go`}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ----- Membership progress (ladder) ----- */}
      {user && (
        <section className="mt-10 border border-chaioz-line bg-white rounded-3xl p-8 grain relative overflow-hidden" data-testid="loyalty-progress">
          <div className="relative z-10 flex flex-wrap justify-between items-end gap-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-chaioz-teal/60">Hi {user.name.split(" ")[0]} —</p>
              <p className="font-serif text-5xl text-chaioz-teal mt-2">{balance} <span className="text-base text-chaioz-teal/60">pts</span></p>
              <p className="text-sm text-chaioz-saffron mt-1 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4" /> {currentTier.name} Member
              </p>
            </div>
            <div className="flex-1 min-w-[260px] max-w-md">
              <div className="flex justify-between text-xs text-chaioz-teal/60 mb-2">
                <span>{currentTier.name}</span>
                <span>{nextTier ? nextTier.name : "Maxed"}</span>
              </div>
              <Progress value={progress} className="h-2 bg-chaioz-line [&>div]:bg-chaioz-saffron" />
              {nextTier && (
                <p className="text-xs text-chaioz-teal/60 mt-2">
                  {nextTier.min - balance} pts to <span className="text-chaioz-saffron">{nextTier.name}</span>
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Membership perks */}
      <section className="mt-12">
        <p className="text-xs uppercase tracking-widest text-chaioz-teal/60 text-center">Membership perks</p>
        <div className="mt-4 grid md:grid-cols-3 gap-5">
          {MEMBERSHIP_TIERS.map((t, i) => (
            <div
              key={t.name}
              data-testid={`tier-${t.name.toLowerCase()}`}
              className={`border rounded-2xl p-6 ${
                currentTier?.name === t.name ? "border-chaioz-saffron bg-chaioz-saffron/5" : "border-chaioz-line bg-white"
              }`}
            >
              <Award className={`w-7 h-7 mb-3 ${i === 0 ? "text-amber-700" : i === 1 ? "text-zinc-400" : "text-chaioz-saffron"}`} />
              <h3 className="font-serif text-2xl text-chaioz-teal">{t.name}</h3>
              <p className="text-xs text-chaioz-teal/60 mt-1">From {t.min} pts</p>
              <ul className="mt-4 space-y-2 text-sm text-chaioz-teal/80">
                {t.perks.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-chaioz-saffron">✦</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* App banner */}
      <section className="mt-16 bg-chaioz-teal rounded-3xl p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center grain relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="font-serif text-4xl text-chaioz-cream">Your chai. In your pocket.</h2>
          <p className="text-chaioz-cream/85 mt-3 max-w-md">
            One-click reorder, push notifications when your favourite drop is ready, and app-only hidden menu items.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6 max-w-md">
            <div className="text-center text-chaioz-cream/85 text-xs">
              <Coffee className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> 1-click reorder
            </div>
            <div className="text-center text-chaioz-cream/85 text-xs">
              <Gift className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> Hidden menu
            </div>
            <div className="text-center text-chaioz-cream/85 text-xs">
              <Users className="w-6 h-6 mx-auto text-chaioz-saffron mb-1" /> Refer & earn $5
            </div>
          </div>
        </div>
        <div className="bg-chaioz-cream p-4 rounded-2xl mx-auto">
          <QrCode className="w-32 h-32 text-chaioz-teal" />
          <p className="text-xs text-chaioz-teal text-center mt-2 font-medium">Scan to download</p>
        </div>
      </section>
    </div>
  );
}
