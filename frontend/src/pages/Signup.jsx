import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Check, X } from "lucide-react";

const NAME_RE = /^[\p{L}\s'\-.]{2,60}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASS_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { label: "At least one number", test: (p) => /\d/.test(p) },
];
const AU_PHONE_RE = /^(\+?61|0)(4\d{8}|[2378]\d{8})$/;

export default function Signup() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [touched, setTouched] = useState({});

  const errors = useMemo(() => {
    const e = {};
    if (touched.name && !NAME_RE.test(name.trim())) e.name = "Use 2-60 letters/spaces";
    if (touched.email && !EMAIL_RE.test(email.trim())) e.email = "Enter a valid email";
    if (touched.phone && phone && !AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, ""))) {
      e.phone = "Enter a valid AU number (e.g. 0412 345 678)";
    }
    return e;
  }, [name, email, phone, touched]);

  const passwordOk = PASS_RULES.every((r) => r.test(password));
  const formOk =
    NAME_RE.test(name.trim()) &&
    EMAIL_RE.test(email.trim()) &&
    passwordOk &&
    (!phone || AU_PHONE_RE.test(phone.replace(/[\s\-()]/g, "")));

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
      await register(name.trim(), email.trim().toLowerCase(), password, phone.trim() || null);
      toast.success("Welcome to Chaioz — 100 bonus points added");
      nav("/menu");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

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
          <Label className="text-chaioz-teal/80">Mobile (optional, AU)</Label>
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
        {err && <p className="text-sm text-red-500" data-testid="signup-error">{err}</p>}
        <Button
          type="submit"
          disabled={busy || !formOk}
          data-testid="signup-submit"
          className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11 disabled:opacity-50"
        >
          {busy ? "Creating..." : "Create account"}
        </Button>
        <p className="text-xs text-chaioz-teal/60 text-center">
          Already have an account? <Link to="/login" className="text-chaioz-saffron hover:underline" data-testid="signup-to-login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
