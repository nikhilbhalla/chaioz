import { Link } from "react-router-dom";
import { Instagram, Phone, Mail, MapPin } from "lucide-react";
import { LOGO_URL } from "@/components/ChaiozLogo";

export default function Footer() {
  return (
    <footer className="bg-chaioz-teal text-chaioz-cream mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <img src={LOGO_URL} alt="Chaioz" className="h-10 mb-4" />
          <p className="text-sm text-chaioz-cream/80 leading-relaxed">
            Adelaide's first authentic Indian chai café. Brewed late, made for connection.
          </p>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Visit</h4>
          <ul className="space-y-3 text-sm text-chaioz-cream/85">
            <li className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> Unit 2, 132 O'Connell St, North Adelaide 5006</li>
            <li className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> (08) 7006 0222</li>
            <li className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> contact@chaioz.com.au</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Explore</h4>
          <ul className="space-y-2 text-sm text-chaioz-cream/85">
            <li><Link to="/menu" className="hover:text-chaioz-saffron">Menu</Link></li>
            <li><Link to="/loyalty" className="hover:text-chaioz-saffron">Rewards</Link></li>
            <li><Link to="/community" className="hover:text-chaioz-saffron">Community & Events</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Hours</h4>
          <ul className="space-y-2 text-sm text-chaioz-cream/85">
            <li>Mon – Thu &nbsp; 5pm – 10pm</li>
            <li>Friday &nbsp; 5pm – 12am</li>
            <li>Saturday &nbsp; 11am – 12am</li>
            <li>Sunday &nbsp; 11am – 10pm</li>
          </ul>
          <a href="https://instagram.com/chaioz_aus" className="inline-flex items-center gap-2 mt-5 text-sm text-chaioz-cream/85 hover:text-chaioz-saffron" data-testid="footer-instagram">
            <Instagram className="w-4 h-4" /> @chaioz_aus
          </a>
        </div>
      </div>
      <div className="border-t border-chaioz-cream/15 py-6 text-center text-xs text-chaioz-cream/60">
        © {new Date().getFullYear()} Chaioz. Brewed in North Adelaide.
      </div>
    </footer>
  );
}
