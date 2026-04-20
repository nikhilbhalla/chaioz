import { Calendar, Clock, MapPin } from "lucide-react";
import InstagramFeed from "@/components/InstagramFeed";

const NIGHT_IMG = "https://images.pexels.com/photos/36505364/pexels-photo-36505364.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const POURING_IMG = "https://images.pexels.com/photos/18413480/pexels-photo-18413480.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const STORY_IMG = "https://images.pexels.com/photos/18413481/pexels-photo-18413481.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const events = [
  { title: "Late Night Karak", subtitle: "Tue–Thu · 9pm–11pm", desc: "Chai + samosa + kulfi for $16. Two hands, one ritual.", img: NIGHT_IMG },
  { title: "Weekday Brekie Deal", subtitle: "Mon–Fri · until 3pm", desc: "Any wrap + hashbrown + kadak chai = $11.95.", img: STORY_IMG },
  { title: "Open Mic Sundays", subtitle: "Every Sunday · 7pm", desc: "Poetry, music, chai. Bring an instrument or just your voice.", img: POURING_IMG },
];

export default function Community() {
  return (
    <div className="pt-28 pb-24 max-w-7xl mx-auto px-6 sm:px-8" data-testid="community-page">
      <div className="mb-12">
        <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">The Chaioz Circle</span>
        <h1 className="font-serif text-5xl md:text-6xl text-chaioz-cream mt-2">Community & Events.</h1>
        <p className="text-chaioz-cream/70 mt-3 max-w-xl">
          Late-night specials, open mics, weekend fixtures. Find your reason to swing by.
        </p>
      </div>

      <section className="grid md:grid-cols-3 gap-5">
        {events.map((e, i) => (
          <article key={i} data-testid={`event-${i}`} className="border border-chaioz-line bg-chaioz-deep rounded-2xl overflow-hidden group">
            <div className="relative h-44 overflow-hidden">
              <img src={e.img} alt={e.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-chaioz-deep to-transparent" />
            </div>
            <div className="p-6">
              <p className="text-xs uppercase tracking-widest text-chaioz-saffron flex items-center gap-2">
                <Clock className="w-3 h-3" /> {e.subtitle}
              </p>
              <h3 className="font-serif text-2xl text-chaioz-cream mt-2">{e.title}</h3>
              <p className="text-sm text-chaioz-cream/70 mt-2 leading-relaxed">{e.desc}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-20">
        <InstagramFeed />
      </section>

      <section className="mt-20 border border-chaioz-line bg-chaioz-deep rounded-3xl p-10 grid md:grid-cols-2 gap-8" data-testid="visit-section">
        <div>
          <span className="text-xs uppercase tracking-[0.3em] text-chaioz-saffron">Visit us</span>
          <h2 className="font-serif text-4xl text-chaioz-cream mt-2">North Adelaide.</h2>
          <p className="text-chaioz-cream/70 mt-3">Slip down O'Connell Street and look for the saffron sign.</p>
          <ul className="mt-6 space-y-3 text-chaioz-cream/80">
            <li className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> Unit 2, 132 O'Connell St, North Adelaide</li>
            <li className="flex gap-2"><Calendar className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> Open 7 days · 'til late</li>
          </ul>
        </div>
        <iframe
          title="Chaioz location"
          src="https://www.google.com/maps?q=132+O%27Connell+St,+North+Adelaide&output=embed"
          className="w-full h-72 rounded-2xl border-0 grayscale"
          loading="lazy"
        />
      </section>
    </div>
  );
}
