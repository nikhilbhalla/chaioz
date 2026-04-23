import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "chaioz_app_banner_dismissed_v1";

export default function AppDownloadBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(KEY);
    if (!dismissed) {
      const t = setTimeout(() => setVisible(true), 8000); // give the user 8s to explore first
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(KEY, Date.now().toString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      data-testid="app-download-banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-40 bg-chaioz-teal text-chaioz-cream rounded-2xl shadow-2xl p-4 flex items-center gap-4 animate-fade-up"
    >
      <div className="w-12 h-12 rounded-xl bg-chaioz-saffron flex items-center justify-center flex-shrink-0">
        <Smartphone className="w-6 h-6 text-chaioz-teal" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Get 10% off – Download Chaioz App</p>
        <p className="text-xs text-chaioz-cream/75 mt-0.5">One-tap reorder + app-only perks.</p>
      </div>
      <Link to="/loyalty" onClick={dismiss} data-testid="app-banner-cta">
        <Button size="sm" className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full whitespace-nowrap">
          Get app
        </Button>
      </Link>
      <button
        onClick={dismiss}
        data-testid="app-banner-dismiss"
        className="text-chaioz-cream/60 hover:text-chaioz-cream transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
