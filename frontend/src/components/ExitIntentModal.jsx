import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Gift } from "lucide-react";

const KEY = "chaioz_exit_intent_shown_v1";

export default function ExitIntentModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY)) return;

    // Fires when cursor leaves the viewport through the top — classic exit intent
    const onMouseLeave = (e) => {
      if (e.clientY <= 0) {
        sessionStorage.setItem(KEY, "1");
        setOpen(true);
        document.removeEventListener("mouseleave", onMouseLeave);
      }
    };
    // Show after a short delay so it doesn't pop during immediate bounce
    const ready = setTimeout(() => {
      document.addEventListener("mouseleave", onMouseLeave);
    }, 4000);
    return () => {
      clearTimeout(ready);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        data-testid="exit-intent-modal"
        className="bg-white border-chaioz-line text-chaioz-teal max-w-md overflow-hidden p-0"
      >
        <div className="bg-chaioz-teal p-8 text-center relative">
          <div className="w-14 h-14 rounded-full bg-chaioz-saffron mx-auto flex items-center justify-center mb-3">
            <Gift className="w-7 h-7 text-chaioz-teal" />
          </div>
          <DialogHeader>
            <DialogTitle className="font-serif text-3xl text-chaioz-cream mt-1">Wait — 10% off?</DialogTitle>
            <DialogDescription className="text-chaioz-cream/85 mt-2">
              Sign up and get 10% off your first order + 100 loyalty points.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-chaioz-teal/70 mb-5">
            Join the ritual — skip the queue, order in one tap.
          </p>
          <div className="flex flex-col gap-2">
            <Link to="/signup" onClick={() => setOpen(false)} data-testid="exit-intent-signup">
              <Button className="w-full rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal h-11">
                Claim 10% off
              </Button>
            </Link>
            <Link to="/loyalty" onClick={() => setOpen(false)} data-testid="exit-intent-app">
              <Button variant="ghost" className="w-full rounded-full text-chaioz-teal hover:text-chaioz-saffron">
                <Smartphone className="w-4 h-4 mr-1.5" /> Download the app
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
