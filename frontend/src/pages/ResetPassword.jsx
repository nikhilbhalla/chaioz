import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

const PASS_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { refresh } = useAuth();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!token) {
      setErr("Missing reset token. Please use the link from your email.");
    }
  }, [token]);

  const passOk = PASS_RULES.every((r) => r.test(password));
  const confirmOk = password.length > 0 && password === confirm;
  const canSubmit = passOk && confirmOk && token;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setErr("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      await refresh();
      toast.success("Password updated — you're now signed in.");
      nav("/account");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Reset failed. The link may have expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="reset-password-page">
      <form onSubmit={submit} className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5">
        <div className="text-center">
          <ChaiozLogo className="h-10 mx-auto mb-3" />
          <h1 className="font-serif text-3xl text-chaioz-teal">Choose a new password</h1>
          <p className="text-sm text-chaioz-teal/60 mt-1">You'll be signed in once it's set.</p>
        </div>

        <div>
          <Label className="text-chaioz-teal/80">New password</Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            required
            data-testid="reset-password-new"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          <ul className="mt-2 space-y-0.5" data-testid="reset-password-rules">
            {PASS_RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li key={r.label} className={`text-[11px] inline-flex items-center gap-1 mr-3 ${ok ? "text-emerald-600" : "text-chaioz-teal/50"}`}>
                  {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {r.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <Label className="text-chaioz-teal/80">Confirm new password</Label>
          <Input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            data-testid="reset-password-confirm"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          {confirm.length > 0 && (
            <p className={`text-[11px] mt-1 ${confirmOk ? "text-emerald-600" : "text-red-500"}`}>
              {confirmOk ? "Passwords match" : "Passwords don't match"}
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-chaioz-teal/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            className="accent-chaioz-saffron"
          />
          Show passwords
        </label>

        {err && <p className="text-sm text-red-500" data-testid="reset-password-error">{err}</p>}

        <Button
          type="submit"
          disabled={busy || !canSubmit}
          data-testid="reset-password-submit"
          className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11 disabled:opacity-50"
        >
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating...</> : "Set new password"}
        </Button>

        <p className="text-xs text-chaioz-teal/60 text-center">
          <Link to="/forgot-password" className="text-chaioz-saffron hover:underline">
            Request a new link
          </Link>
        </p>
      </form>
    </div>
  );
}
