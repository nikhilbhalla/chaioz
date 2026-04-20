import { Link } from "react-router-dom";
import { Instagram, Phone, Mail, MapPin } from "lucide-react";
import ChaiozLogo from "@/components/ChaiozLogo";

export default function Footer() {
  return (
    <footer className="border-t border-chaioz-line bg-chaioz-ink mt-24" data-testid="site-footer">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <ChaiozLogo className="h-10 mb-4" />
          <p className="text-sm text-chaioz-cream/70 leading-relaxed">
            Adelaide's first authentic Indian chai café. Brewed late, made for connection.
          </p>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Visit</h4>
          <ul className="space-y-3 text-sm text-chaioz-cream/80">
            <li className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> Unit 2, 132 O'Connell St, North Adelaide 5006</li>
            <li className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> (08) 7006 0222</li>
            <li className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 text-chaioz-saffron"/> contact@chaioz.com.au</li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Explore</h4>
          <ul className="space-y-2 text-sm text-chaioz-cream/80">
            <li><Link to="/menu" className="hover:text-chaioz-saffron">Menu</Link></li>
            <li><Link to="/store" className="hover:text-chaioz-saffron">Shop Chai Blends</Link></li>
            <li><Link to="/loyalty" className="hover:text-chaioz-saffron">Rewards</Link></li>
            <li><Link to="/community" className="hover:text-chaioz-saffron">Community & Events</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm uppercase tracking-[0.2em] text-chaioz-saffron mb-4 font-sans font-semibold">Hours</h4>
          <ul className="space-y-2 text-sm text-chaioz-cream/80">
            <li>Mon – Thu &nbsp; 10am – 11pm</li>
            <li>Fri – Sat &nbsp; 10am – 1am</li>
            <li>Sunday &nbsp; 11am – 11pm</li>
          </ul>
          <a href="https://instagram.com/chaioz" className="inline-flex items-center gap-2 mt-5 text-sm text-chaioz-cream/80 hover:text-chaioz-saffron" data-testid="footer-instagram">
            <Instagram className="w-4 h-4" /> @chaioz
          </a>
        </div>
      </div>
      <div className="border-t border-chaioz-line py-6 text-center text-xs text-chaioz-cream/50">
        © {new Date().getFullYear()} Chaioz. Brewed in North Adelaide.
      </div>
    </footer>
  );
}
