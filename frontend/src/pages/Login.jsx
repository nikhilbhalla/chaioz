import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChaiozLogo from "@/components/ChaiozLogo";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const u = await login(email, password);
      toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
      nav(u.role === "admin" ? "/admin" : "/account");
    } catch (e) {
      setErr(formatApiError(e.response?.data?.detail) || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-24" data-testid="login-page">
      <form onSubmit={submit} className="w-full max-w-sm border border-chaioz-line bg-white rounded-3xl p-8 space-y-5">
        <div className="text-center">
          <ChaiozLogo className="h-10 mx-auto mb-3"/>
          <h1 className="font-serif text-3xl text-chaioz-teal">Welcome back</h1>
          <p className="text-sm text-chaioz-teal/60 mt-1">Sign in to keep brewing.</p>
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
        </div>
        <div>
          <Label className="text-chaioz-teal/80">Password</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password" className="mt-1 bg-chaioz-cream border-chaioz-line text-chaioz-teal" />
        </div>
        {err && <p className="text-sm text-red-400" data-testid="login-error">{err}</p>}
        <Button type="submit" disabled={busy} data-testid="login-submit" className="w-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal rounded-full h-11">
          {busy ? "Signing in..." : "Sign in"}
        </Button>
        <p className="text-xs text-chaioz-teal/60 text-center">
          New here? <Link to="/signup" className="text-chaioz-saffron hover:underline" data-testid="login-to-signup">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
