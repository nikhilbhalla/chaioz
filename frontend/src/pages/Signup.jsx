import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";
import { Check, X, Mail, Phone, ArrowLeft, Loader2 } from "lucide-react";

const NAME_RE = /^[\p{L}\s'\-.]{2,60}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASS_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];
const AU_PHONE_RE = /^(\+?61|0)(4\d{8}|[2378]\d{8})$/;

export default function Signup() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState("form"); // form | verify

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [channel, setChannel] = useState("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState({});

  // OTP state
  const [pending, setPending] = useState(null); // {pending_id, target, channel, dev_mode}
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const codeInput = useRef(null);

  const errors = useMemo(() => {
    const e = {};
    if (touched.name && !NAME_RE.test(name.trim())) e.name = "Use 2-60 letters/spaces";
    if (touched.email && !EMAIL_RE.test(email.trim())) e.email = "Enter a valid email";
    if ((touched.phone || channel === "phone") && phone && !AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, ""))) {
      e.phone = "Enter a valid AU number (e.g. 0412 345 678)";
    }
    if (channel === "phone" && !phone) e.phone = "Phone required to verify by SMS";
    return e;
  }, [name, email, phone, channel, touched]);

  const passwordOk = PASS_RULES.every((r) => r.test(password));
  const formOk =
    NAME_RE.test(name.trim()) &&
    EMAIL_RE.test(email.trim()) &&
    passwordOk &&
    (channel === "email" ? (!phone || AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, "")))
                         : AU_PHONE_RE.test((phone || "").replace(/[\s\-()]/g, "")));

  const submit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, phone: true, password: true });
    if (!formOk) {
      setErr("Please fix the highlighted fields");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const { data } = await api.post("/auth/signup/start", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || null,
        channel,
      });
      setPending(data);
      setStep("verify");
      setTimeout(() => codeInput.current?.focus(), 50);
      const where = channel === "phone" ? "phone" : "inbox";
      toast.success(`We sent a 6-digit code to your ${where}.`);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    if (code.length < 6) return;
    setVerifying(true);
    setErr("");
    try {
      await api.post("/auth/signup/verify", { pending_id: pending.pending_id, code });
      await refresh();
      toast.success("Welcome to Chaioz — 100 bonus points added");
      nav("/menu");
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Verification failed");
      setCode("");
      codeInput.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setErr("");
    try {
      await api.post("/auth/signup/resend", { pending_id: pending.pending_id });
      toast.success(`Sent a new code to ${pending.target}.`);
    } catch (e2) {
      setErr(formatApiError(e2.response?.data?.detail) || "Could not resend");
    } finally {
      setResending(false);
    }
  };

  // Auto-submit once 6 digits have been entered.
  useEffect(() => {
    if (step === "verify" && code.length === 6 && !verifying) {
      verify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (step === "verify" && pending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="signup-verify-page">
        <form onSubmit={verify} className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5">
          <button
            type="button"
            onClick={() => { setStep("form"); setCode(""); setErr(""); }}
            className="flex items-center gap-1.5 text-xs text-chaioz-teal/60 hover:text-chaioz-saffron"
            data-testid="signup-verify-back"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Edit details
          </button>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-chaioz-saffron/15 flex items-center justify-center mb-3">
              {pending.channel === "phone" ? <Phone className="w-5 h-5 text-chaioz-saffron"/> : <Mail className="w-5 h-5 text-chaioz-saffron"/>}
            </div>
            <h1 className="font-serif text-3xl text-chaioz-teal">Check your {pending.channel === "phone" ? "phone" : "inbox"}</h1>
            <p className="text-sm text-chaioz-teal/60 mt-1">We sent a 6-digit code to <span className="font-medium text-chaioz-teal" data-testid="signup-verify-target">{pending.target}</span></p>
          </div>

          <div>
            <Label className="text-chaioz-teal/80">Verification code</Label>
            <Input
              ref={codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoComplete="one-time-code"
              data-testid="signup-verify-code"
              className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal text-center text-2xl tracking-[0.5em] h-14 font-mono"
            />
            {err && <p className="text-sm text-red-500 mt-2" data-testid="signup-verify-error">{err}</p>}
          </div>

          <Button
            type="submit"
            disabled={verifying || code.length < 6}
            data-testid="signup-verify-submit"
            className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11 disabled:opacity-50"
          >
            {verifying ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Verifying...</>) : "Verify & finish"}
          </Button>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              data-testid="signup-verify-resend"
              className="text-chaioz-saffron hover:underline disabled:opacity-50"
            >
              {resending ? "Sending..." : "Resend code"}
            </button>
            {pending.dev_mode && (
              <span className="text-[11px] text-amber-600" data-testid="signup-verify-devmode">
                Dev mode — check server logs for the code.
              </span>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="signup-page">
      <form onSubmit={submit} className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5">
        <div className="text-center">
          <ChaiozLogo className="h-10 mx-auto mb-3" />
          <h1 className="font-serif text-3xl text-chaioz-teal">Join the ritual</h1>
          <p className="text-sm text-chaioz-teal/60 mt-1">100 bonus pts + 10% off your first order.</p>
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Full name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            required
            data-testid="signup-name"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1" data-testid="signup-name-error">{errors.name}</p>}
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Email</Label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            type="email"
            required
            data-testid="signup-email"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1" data-testid="signup-email-error">{errors.email}</p>}
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Mobile {channel === "phone" ? "(required)" : "(optional, AU)"}</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            placeholder="0412 345 678"
            type="tel"
            data-testid="signup-phone"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          <p className="text-[11px] text-chaioz-teal/50 mt-1">Used for Square Loyalty + order-ready SMS.</p>
          {errors.phone && <p className="text-xs text-red-500 mt-1" data-testid="signup-phone-error">{errors.phone}</p>}
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Password</Label>
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            type="password"
            required
            minLength={8}
            data-testid="signup-password"
            className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal"
          />
          <ul className="mt-2 space-y-0.5" data-testid="signup-password-rules">
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
          <Label className="text-chaioz-teal/80">Verify with</Label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              type="button"
              onClick={() => setChannel("email")}
              data-testid="signup-channel-email"
              className={`flex items-center gap-2 border rounded-xl p-3 text-sm ${channel === "email" ? "border-chaioz-saffron bg-chaioz-saffron/5 text-chaioz-teal" : "border-chaioz-line text-chaioz-teal/70"}`}
            >
              <Mail className="w-4 h-4 text-chaioz-saffron" /> Email
            </button>
            <button
              type="button"
              onClick={() => setChannel("phone")}
              data-testid="signup-channel-phone"
              className={`flex items-center gap-2 border rounded-xl p-3 text-sm ${channel === "phone" ? "border-chaioz-saffron bg-chaioz-saffron/5 text-chaioz-teal" : "border-chaioz-line text-chaioz-teal/70"}`}
            >
              <Phone className="w-4 h-4 text-chaioz-saffron" /> SMS
            </button>
          </div>
          <p className="text-[11px] text-chaioz-teal/50 mt-1.5">We'll send a 6-digit code to confirm it's really you. No spam.</p>
        </div>

        {err && <p className="text-sm text-red-500" data-testid="signup-error">{err}</p>}
        <Button
          type="submit"
          disabled={busy || !formOk}
          data-testid="signup-submit"
          className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11 disabled:opacity-50"
        >
          {busy ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Sending code...</>) : "Send verification code"}
        </Button>
        <p className="text-xs text-chaioz-teal/60 text-center">
          Already have an account? <Link to="/login" className="text-chaioz-saffron hover:underline" data-testid="signup-to-login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
