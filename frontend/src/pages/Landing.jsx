import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Coffee, Moon, Heart, Smartphone, QrCode, Clock, Sunrise, Zap } from "lucide-react";
import { api, fmtAUD } from "@/lib/api";
import MenuItemCard from "@/components/MenuItemCard";
import ItemCustomizeDialog from "@/components/ItemCustomizeDialog";
import CombosStrip from "@/components/CombosStrip";
import WelcomeBack from "@/components/WelcomeBack";
import { useCart } from "@/contexts/CartContext";
import { useDayMode } from "@/contexts/DayModeContext";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/0541d98d204de4f369b3369b8537f36258ac67b686df88d760a0cbf6cee08ece.png";
const STORY_IMG = "https://images.pexels.com/photos/18413481/pexels-photo-18413481.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const NIGHT_IMG = "https://images.pexels.com/photos/36505364/pexels-photo-36505364.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const SNACKS_IMG = "https://static.prod-images.emergentagent.com/jobs/7ffc6ec8-b182-4519-9a18-5bb47b9cfc96/images/af3bbb81ecdd9f6da2491746b5bcca7b748689b891de11b8d2d3618b4bd6cc5e.png";
const POURING_IMG = "https://images.pexels.com/photos/18413480/pexels-photo-18413480.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const [bestsellers, setBestsellers] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const { addItem } = useCart();
  const { isMorning } = useDayMode();

  useEffect(() => {
    api.get("/menu/bestsellers").then((r) => setBestsellers(r.data || [])).catch(() => {});
  }, []);

  const onAdd = (item) => {
    if (item.sizes?.length || item.addons?.length) setActiveItem(item);
    else {
      addItem({
        item_id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        size: null,
        addons: [],
        notes: null,
        line_total: item.price,
      });
    }
  };

  return (
    <div data-testid="landing-page">
      {/* HERO — switches copy + CTA based on time of day */}
      <section className="relative pt-24 min-h-[90vh] flex items-end overflow-hidden">
        <img src={HERO_BG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 bg-gradient-to-t ${isMorning ? "from-chaioz-saffron/90 via-chaioz-saffron/40 to-chaioz-cream/10" : "from-chaioz-teal via-chaioz-teal/75 to-chaioz-teal/10"}`} />
        <div className="absolute inset-0 grain opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 pb-20 md:pb-32 w-full">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-chaioz-saffron mb-6">
              {isMorning ? <Sunrise className="w-3 h-3" /> : <Moon className="w-3 h-3" />} North Adelaide
            </span>
            {isMorning ? (
              <>
                <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-chaioz-teal text-balance">
                  Good morning.
                  <br />
                  <span className="italic">Chai's brewing.</span>
                </h1>
                <p className="text-base md:text-lg text-chaioz-teal/85 mt-6 max-w-xl leading-relaxed">
                  Bun maska, masala omelette wraps, karak chai — all hot, all under $12. Ready for pickup in 5–10 minutes.
                </p>
                <div className="flex flex-wrap gap-3 mt-10">
                  <Link to="/menu?tag=quick_breakfast" data-testid="hero-order-button">
                    <Button className="bg-chaioz-teal text-chaioz-cream hover:bg-chaioz-tealHover hover:text-chaioz-cream rounded-full h-14 px-8 text-base">
                      Order Breakfast <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/loyalty" data-testid="hero-app-button">
                    <Button variant="outline" className="rounded-full h-14 px-8 text-base bg-white/80 border-chaioz-teal/20 text-chaioz-teal hover:bg-white hover:text-chaioz-teal">
                      <Smartphone className="w-4 h-4 mr-2" /> Get the app
                    </Button>
                  </Link>
                </div>
                <p className="inline-flex items-center gap-2 text-xs text-chaioz-teal/80 mt-8 bg-white/60 backdrop-blur px-3 py-1.5 rounded-full">
                  <Clock className="w-3.5 h-3.5 text-chaioz-teal" /> Ready in 5–10 mins · Pickup only
                </p>
              </>
            ) : (
              <>
                <h1 className="font-serif text-5xl sm:text-7xl lg:text-8xl leading-[0.9] tracking-tight text-chaioz-cream text-balance">
                  Your late-night
                  <br />
                  <span className="text-chaioz-saffron italic">chai ritual.</span>
                </h1>
                <p className="text-base md:text-lg text-chaioz-cream/85 mt-6 max-w-xl leading-relaxed">
                  Adelaide's first authentic Indian chai café. Brewed slow, served warm, made for the people who arrive when the city softens.
                </p>
                <div className="flex flex-wrap gap-3 mt-10">
                  <Link to="/menu" data-testid="hero-order-button">
                    <Button className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-14 px-8 text-base">
                      Order Pickup <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <Link to="/loyalty" data-testid="hero-app-button">
                    <Button variant="outline" className="rounded-full h-14 px-8 text-base bg-transparent border-chaioz-cream/40 text-chaioz-cream hover:bg-chaioz-cream/10 hover:text-chaioz-saffron">
                      <Smartphone className="w-4 h-4 mr-2" /> Download App
                    </Button>
                  </Link>
                </div>
                <div className="mt-12 flex items-center gap-6 text-xs text-chaioz-cream/70">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                    <Star className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                    <Star className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                    <Star className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                    <Star className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                    <span className="ml-2 text-chaioz-cream/85">4.8 on Google · 1,200+ reviews</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Welcome back for returning customers */}
      <WelcomeBack />

      {/* Smart combos */}
      <CombosStrip highlight={isMorning ? "brekie-combo" : "late-night-combo"} />

      {/* MARQUEE */}
      <section className="bg-chaioz-teal overflow-hidden border-y border-chaioz-teal">
        <div className="flex animate-marquee whitespace-nowrap py-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-10 px-10 text-chaioz-cream font-serif text-2xl tracking-wide">
              <span>AUTHENTIC INDIAN CHAI</span><span className="text-chaioz-saffron">✦</span>
              <span>LATE NIGHT EATS</span><span className="text-chaioz-saffron">✦</span>
              <span>STREET FOOD</span><span className="text-chaioz-saffron">✦</span>
              <span>BUN MASKA</span><span className="text-chaioz-saffron">✦</span>
              <span>PISTACHIO MILKCAKE</span><span className="text-chaioz-saffron">✦</span>
            </div>
          ))}
        </div>
      </section>

      {/* BESTSELLERS */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24" data-testid="bestsellers-section">
        <div className="flex justify-between items-end mb-10">
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Crowd favourites</span>
            <h2 className="font-serif text-4xl md:text-5xl text-chaioz-teal mt-2">The hits, on rotation.</h2>
          </div>
          <Link to="/menu" className="hidden md:inline-flex text-sm text-chaioz-saffron hover:underline" data-testid="bestsellers-view-all">
            View full menu →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {bestsellers.slice(0, 8).map((it) => (
            <MenuItemCard key={it.id} item={it} onAdd={onAdd} />
          ))}
        </div>
      </section>

      {/* COMBO STRIP */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12 grid md:grid-cols-3 gap-5" data-testid="combos-section">
        {[
          { title: "Chai + Bun Maska", price: "10.50", subtitle: "Adelaide's $10 ritual.", img: SNACKS_IMG },
          { title: "Late Night Combo", price: "16.00", subtitle: "Karak chai + samosa + kulfi.", img: NIGHT_IMG },
          { title: "Brekie Deal", price: "11.95", subtitle: "Wrap + hashbrown + chai. Til 3pm.", img: POURING_IMG },
        ].map((c, i) => (
          <div key={i} data-testid={`combo-card-${i}`} className="relative h-72 rounded-2xl overflow-hidden border border-chaioz-line group cursor-pointer">
            <img src={c.img} alt={c.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-chaioz-teal via-chaioz-teal/60 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-6">
              <p className="text-xs uppercase tracking-widest text-chaioz-saffron mb-1">Combo</p>
              <h3 className="font-serif text-2xl text-chaioz-cream">{c.title}</h3>
              <p className="text-sm text-chaioz-cream/85 mt-1">{c.subtitle}</p>
              <span className="inline-block mt-3 bg-chaioz-saffron text-chaioz-teal text-sm font-medium px-3 py-1 rounded-full">
                from ${c.price}
              </span>
            </div>
          </div>
        ))}
      </section>

      {/* WHY CHAIOZ */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24 grid md:grid-cols-2 gap-12 items-center" data-testid="why-chaioz">
        <div className="relative h-96 md:h-[500px] rounded-3xl overflow-hidden border border-chaioz-line">
          <img src={STORY_IMG} alt="Chaioz story" className="w-full h-full object-cover" />
        </div>
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">The Chaioz way</span>
          <h2 className="font-serif text-4xl md:text-5xl text-chaioz-teal mt-2 leading-tight">
            One recipe. Three generations. <span className="italic text-chaioz-saffron">A whole city.</span>
          </h2>
          <p className="text-chaioz-teal/70 mt-6 leading-relaxed">
            Every cup at Chaioz starts with a recipe that travelled from a kitchen in India to Adelaide's O'Connell Street — same spices, same ratio, same stubborn love for doing it slowly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8">
            {[
              { icon: Coffee, label: "Hand-blended spices" },
              { icon: Moon, label: "Open until late" },
              { icon: Heart, label: "Family recipe" },
            ].map((f, i) => (
              <div key={i} className="border border-chaioz-line rounded-xl p-4 text-center bg-white">
                <f.icon className="w-5 h-5 text-chaioz-saffron mx-auto mb-2" />
                <p className="text-sm text-chaioz-teal/80">{f.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP BANNER */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-12">
        <div className="relative overflow-hidden rounded-3xl bg-chaioz-teal grain p-10 md:p-16">
          <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Chaioz app</span>
              <h2 className="font-serif text-4xl md:text-5xl text-chaioz-cream mt-3 leading-tight">
                Skip the queue. Earn chai for free.
              </h2>
              <p className="text-chaioz-cream/85 mt-4 max-w-md">
                Download the app and get <span className="text-chaioz-saffron font-medium">10% off your first order</span> + 100 bonus rewards points.
              </p>
              <div className="flex gap-3 mt-6">
                <Link to="/signup" data-testid="app-cta-signup">
                  <Button className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal h-12 px-6">
                    Claim 10% off
                  </Button>
                </Link>
                <Button variant="outline" className="rounded-full bg-transparent border-chaioz-cream/40 text-chaioz-cream hover:bg-chaioz-cream/10 hover:text-chaioz-saffron h-12 px-6" data-testid="app-cta-app-store">
                  App Store
                </Button>
              </div>
            </div>
            <div className="flex md:justify-end">
              <div className="bg-chaioz-cream p-4 rounded-2xl">
                <QrCode className="w-32 h-32 text-chaioz-teal" data-testid="app-qr-code" />
                <p className="text-xs text-chaioz-teal text-center mt-2 font-medium">Scan to download</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 py-24" data-testid="reviews-section">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Word on the street</span>
          <h2 className="font-serif text-4xl md:text-5xl text-chaioz-teal mt-2">What chai lovers say.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {[
            { name: "Priya K.", text: "The Karak chai is exactly like home. The pistachio milkcake is dangerous.", rating: 5 },
            { name: "Jacob T.", text: "Found my new midnight spot. Vibe, food and the chai. 10/10.", rating: 5 },
            { name: "Aisha R.", text: "Bun maska + masala chai > everything else in Adelaide. Sorry.", rating: 5 },
          ].map((r, i) => (
            <div key={i} data-testid={`review-${i}`} className="border border-chaioz-line bg-white rounded-2xl p-6">
              <div className="flex gap-1 mb-3">
                {[...Array(r.rating)].map((_, k) => (
                  <Star key={k} className="w-4 h-4 fill-chaioz-saffron text-chaioz-saffron" />
                ))}
              </div>
              <p className="text-chaioz-teal/80 leading-relaxed text-sm">"{r.text}"</p>
              <p className="text-chaioz-saffron text-xs mt-4 uppercase tracking-wider">— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      <ItemCustomizeDialog item={activeItem} open={!!activeItem} onClose={() => setActiveItem(null)} />
    </div>
  );
}
