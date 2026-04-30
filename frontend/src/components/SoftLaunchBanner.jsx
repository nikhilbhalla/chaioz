import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Info, X } from "lucide-react";

/** Tiny non-intrusive banner that shows the admin-configured `soft_launch_banner`
 *  text. Sits above the sticky <Header /> so it pushes everything down once,
 *  then disappears after the customer dismisses it (per-tab via sessionStorage). */
export default function SoftLaunchBanner() {
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("chaioz-soft-banner-dismissed") === "1") {
      setDismissed(true);
      return;
    }
    api.get("/settings").then((r) => setText((r.data?.soft_launch_banner || "").trim())).catch(() => {});
  }, []);

  if (!text || dismissed) return null;

  return (
    <div className="bg-chaioz-saffron text-chaioz-teal" data-testid="soft-launch-banner">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 text-xs sm:text-sm">
        <Info className="w-4 h-4 flex-shrink-0" />
        <p className="flex-1 leading-snug">{text}</p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("chaioz-soft-banner-dismissed", "1");
            setDismissed(true);
          }}
          aria-label="Dismiss banner"
          data-testid="soft-launch-banner-close"
          className="p-1 hover:bg-chaioz-teal/10 rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
