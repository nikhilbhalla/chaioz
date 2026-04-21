import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Signup() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await register(name, email, password);
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
          <Label className="text-chaioz-teal/80">Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="signup-name" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="signup-email" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Password (min 6)</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={6} required data-testid="signup-password" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
        </div>
        {err && <p className="text-sm text-red-400" data-testid="signup-error">{err}</p>}
        <Button type="submit" disabled={busy} data-testid="signup-submit" className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11">
          {busy ? "Creating..." : "Create account"}
        </Button>
        <p className="text-xs text-chaioz-teal/60 text-center">
          Already have an account? <Link to="/login" className="text-chaioz-saffron hover:underline" data-testid="signup-to-login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
