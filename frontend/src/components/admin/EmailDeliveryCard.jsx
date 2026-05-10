import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, Send, Loader2, XCircle, RefreshCw } from "lucide-react";

/** Surfaces Resend config + a one-click test send so the operator can quickly
 *  diagnose why customer emails aren't landing in inboxes. */
export default function EmailDeliveryCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const { data } = await api.get("/admin/email/status");
      setStatus(data);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendTest = async (e) => {
    e.preventDefault();
    if (!to) return;
    setBusy(true);
    try {
      const { data } = await api.post("/admin/email/test", { to });
      if (data.status === "sent") {
        toast.success(`Test sent (id ${data.id?.slice(0, 8)}…). Check the inbox.`);
      } else if (data.status === "logged") {
        toast.info("Resend is in dev mode — email was logged, not sent. Verify a domain to deliver to real recipients.");
      } else {
        toast.error(data.error || "Send failed");
      }
    } catch (e2) {
      toast.error(e2.response?.data?.detail || "Send failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="border border-chaioz-line bg-white rounded-2xl p-6 flex items-center gap-3 text-chaioz-teal/60">
        <Loader2 className="w-4 h-4 animate-spin" /> Checking email config…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="email-delivery-error">
        <div className="flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-serif text-xl text-chaioz-teal">Email delivery</h3>
            <p className="text-xs text-red-500 mt-1">Could not load email config — is the backend running?</p>
            <Button variant="outline" size="sm" onClick={load} className="mt-3 rounded-full h-8">
              <RefreshCw className="w-3 h-3 mr-1" /> Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!status) return null;
  const ok = status.delivers_to_anyone;

  return (
    <div className="border border-chaioz-line bg-white rounded-2xl p-6" data-testid="email-delivery-card">
      <div className="flex items-start gap-3">
        {ok ? <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />}
        <div className="flex-1">
          <h3 className="font-serif text-xl text-chaioz-teal">Email delivery</h3>
          <p className="text-xs text-chaioz-teal/60 mt-1">
            Powers signup OTPs, order confirmations, and abandoned-cart emails. Powered by Resend.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
            <dt className="text-chaioz-teal/60">Resend key</dt>
            <dd className="text-chaioz-teal font-medium">{status.has_resend_key ? "Configured" : "Missing"}</dd>
            <dt className="text-chaioz-teal/60">Sender</dt>
            <dd className="text-chaioz-teal font-medium font-mono">{status.sender_email}</dd>
            <dt className="text-chaioz-teal/60">Delivers to anyone</dt>
            <dd className={`font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>{ok ? "Yes" : "No — sandbox sender"}</dd>
          </dl>

          {!ok && status.fix_steps?.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3" data-testid="email-fix-steps">
              <p className="text-xs font-semibold text-amber-900 mb-1.5">Fix in 3 steps:</p>
              <ol className="text-xs text-amber-900 space-y-1 list-decimal pl-4">
                {status.fix_steps.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </div>
          )}

          <form onSubmit={sendTest} className="mt-4">
            <Label className="text-chaioz-teal/70 text-xs">Send a test email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                type="email"
                placeholder="you@example.com"
                data-testid="email-test-to"
                className="bg-chaioz-cream border-chaioz-line text-chaioz-teal flex-1"
              />
              <Button type="submit" disabled={busy || !to} data-testid="email-test-send" className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : (<><Send className="w-4 h-4 mr-1.5" /> Send</>)}
              </Button>
            </div>
            <p className="text-[11px] text-chaioz-teal/50 mt-1.5">
              {ok ? "Test will be sent to the address above." : "Sandbox mode — only your verified admin email will actually receive."}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
