import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { api, formatApiError } from "@/lib/api";
import { CheckCircle, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="forgot-password-sent">
        <div className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5 text-center">
          <CheckCircle className="w-12 h-12 text-chaioz-saffron mx-auto" />
          <h1 className="font-serif text-3xl text-chaioz-teal">Check your inbox</h1>
          <p className="text-sm text-chaioz-teal/70 leading-relaxed">
            If an account exists for <span className="font-medium text-chaioz-teal">{email}</span>, we've sent a reset link. It expires in 30 minutes.
          </p>
          <p className="text-xs text-chaioz-teal/50">
            No email? Check your spam folder or{" "}
            <button
              onClick={() => { setSent(false); setErr(""); }}
              className="text-chaioz-saffron hover:underline"
            >
              try again
            </button>.
          </p>
          <Link to="/login" className="block text-xs text-chaioz-teal/60 hover:text-chaioz-saffron">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="forgot-password-page">
      <form onSubmit={submit} className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5">
        <div className="text-center">
          <ChaiozLogo className="h-10 mx-auto mb-3" />
          <h1 className="font-serif text-3xl text-chaioz-teal">Forgot password?</h1>
          <p className="text-sm text-chaioz-teal/60 mt-1">
            Enter your email and we'll send a reset link.
          </p>
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoFocus
            data-testid="forgot-password-email"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
        </div>
        {err && <p className="text-sm text-red-500" data-testid="forgot-password-error">{err}</p>}
        <Button
          type="submit"
          disabled={busy}
          data-testid="forgot-password-submit"
          className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11"
        >
          {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send reset link"}
        </Button>
        <p className="text-xs text-chaioz-teal/60 text-center">
          Remembered it?{" "}
          <Link to="/login" className="text-chaioz-saffron hover:underline" data-testid="forgot-to-login">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
