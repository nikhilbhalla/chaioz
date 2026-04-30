import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, KeyRound, Trash2, Pencil, Loader2, ShieldCheck } from "lucide-react";

const PAGE_SIZE = 25;

export default function UsersTab({ currentAdmin }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("any");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), skip: String(skip) });
      if (q.trim()) params.set("q", q.trim());
      if (role !== "any") params.set("role", role);
      const { data } = await api.get(`/admin/users?${params.toString()}`);
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, role]);

  const onSearch = (e) => {
    e.preventDefault();
    setSkip(0);
    load();
  };

  const remove = async (u) => {
    if (u.id === currentAdmin?.id) { toast.error("You can't delete your own account"); return; }
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Delete failed");
    }
  };

  const page = useMemo(() => Math.floor(skip / PAGE_SIZE) + 1, [skip]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  return (
    <div data-testid="admin-users">
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <form onSubmit={onSearch} className="flex-1 min-w-[260px]">
          <Label className="text-chaioz-teal/70 text-xs">Search by email, name or phone</Label>
          <div className="relative mt-1">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. chaiozadl, 0412..."
              data-testid="users-search"
              className="bg-white border-chaioz-line text-chaioz-teal pl-9"
            />
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-chaioz-teal/50" />
          </div>
        </form>
        <div>
          <Label className="text-chaioz-teal/70 text-xs">Role</Label>
          <Select value={role} onValueChange={(v) => { setRole(v); setSkip(0); }}>
            <SelectTrigger data-testid="users-role-filter" className="mt-1 w-40 bg-white border-chaioz-line text-chaioz-teal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border-chaioz-line">
              <SelectItem value="any">All</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          data-testid="users-create-btn"
          className="rounded-full bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal"
        >
          <Plus className="w-4 h-4 mr-1.5" /> New user
        </Button>
      </div>

      <div className="border border-chaioz-line bg-white rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-chaioz-cream text-chaioz-teal/70 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Phone</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left hidden md:table-cell">Pts</th>
              <th className="px-4 py-3 text-left hidden lg:table-cell">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-chaioz-line/60">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-chaioz-teal/60"><Loader2 className="w-4 h-4 inline animate-spin mr-2"/>Loading users…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-chaioz-teal/60">No users match your search.</td></tr>
            )}
            {!loading && items.map((u) => (
              <tr key={u.id} className="text-chaioz-teal hover:bg-chaioz-cream/40" data-testid={`user-row-${u.id}`}>
                <td className="px-4 py-3">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-chaioz-teal/60">{u.email}</div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-chaioz-teal/70">{u.phone || "—"}</td>
                <td className="px-4 py-3">
                  {u.role === "admin" ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-chaioz-saffron/15 text-chaioz-saffron px-2 py-1 rounded-full font-medium uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-xs text-chaioz-teal/70 uppercase tracking-wider">Customer</span>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-chaioz-teal/70">{u.loyalty_points || 0}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-chaioz-teal/60">{(u.created_at || "").slice(0, 10)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button variant="ghost" size="sm" onClick={() => setResetting(u)} data-testid={`user-reset-${u.id}`} className="text-chaioz-teal/70 hover:text-chaioz-saffron hover:bg-chaioz-saffron/10">
                    <KeyRound className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(u)} data-testid={`user-edit-${u.id}`} className="text-chaioz-teal/70 hover:text-chaioz-saffron hover:bg-chaioz-saffron/10">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(u)} data-testid={`user-delete-${u.id}`} className="text-chaioz-teal/70 hover:text-red-500 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-4 py-3 border-t border-chaioz-line text-xs text-chaioz-teal/70">
          <div data-testid="users-total">{total} user{total === 1 ? "" : "s"} total · page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))} data-testid="users-prev" className="bg-white">Previous</Button>
            <Button variant="outline" size="sm" disabled={skip + PAGE_SIZE >= total} onClick={() => setSkip(skip + PAGE_SIZE)} data-testid="users-next" className="bg-white">Next</Button>
          </div>
        </div>
      </div>

      <UserCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setSkip(0); load(); }} />
      <UserEditDialog user={editing} onClose={() => setEditing(null)} onSaved={load} currentAdminId={currentAdmin?.id} />
      <UserResetPasswordDialog user={resetting} onClose={() => setResetting(null)} />
    </div>
  );
}

function UserCreateDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "customer" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const reset = () => { setForm({ name: "", email: "", phone: "", password: "", role: "customer" }); setErr(""); };
  const close = () => { reset(); onClose(); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post("/admin/users", form);
      toast.success(`Created ${form.email}`);
      onSaved?.();
      close();
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Create failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="bg-white border-chaioz-line text-chaioz-teal sm:max-w-md" data-testid="user-create-dialog">
        <DialogHeader><DialogTitle className="font-serif text-2xl">New user</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-create-name" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" required className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-create-email" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Phone (optional)</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0412 345 678" className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-create-phone" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Password (8+ chars, letter + digit)</Label>
            <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} type="text" required minLength={8} className="mt-1 bg-chaioz-cream border-chaioz-line font-mono" data-testid="user-create-password" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger data-testid="user-create-role" className="mt-1 bg-chaioz-cream border-chaioz-line"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-chaioz-line">
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {err && <p className="text-sm text-red-500" data-testid="user-create-error">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} className="bg-white">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="user-create-submit" className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              {busy ? "Creating…" : "Create user"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserEditDialog({ user, onClose, onSaved, currentAdminId }) {
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        role: user.role || "customer",
        loyalty_points: user.loyalty_points ?? 0,
      });
      setErr("");
    }
  }, [user]);

  if (!user) return null;
  const isSelf = user.id === currentAdminId;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.patch(`/admin/users/${user.id}`, {
        ...form,
        loyalty_points: Number(form.loyalty_points) || 0,
      });
      toast.success("User updated");
      onSaved?.();
      onClose();
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-chaioz-line text-chaioz-teal sm:max-w-md" data-testid="user-edit-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Edit {user.email}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-edit-name" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-edit-phone" />
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Role</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })} disabled={isSelf}>
              <SelectTrigger data-testid="user-edit-role" className="mt-1 bg-chaioz-cream border-chaioz-line"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-chaioz-line">
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            {isSelf && <p className="text-[11px] text-chaioz-teal/50 mt-1">You can't change your own role.</p>}
          </div>
          <div>
            <Label className="text-chaioz-teal/80 text-xs">Loyalty points</Label>
            <Input type="number" min="0" value={form.loyalty_points} onChange={(e) => setForm({ ...form, loyalty_points: e.target.value })} className="mt-1 bg-chaioz-cream border-chaioz-line" data-testid="user-edit-points" />
          </div>
          {err && <p className="text-sm text-red-500" data-testid="user-edit-error">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="bg-white">Cancel</Button>
            <Button type="submit" disabled={busy} data-testid="user-edit-submit" className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UserResetPasswordDialog({ user, onClose }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setPw(""); setErr(""); }, [user]);

  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await api.post(`/admin/users/${user.id}/reset-password`, { new_password: pw });
      toast.success(`Password reset for ${user.email} — share it with them securely.`);
      onClose();
    } catch (e2) {
      setErr(e2.response?.data?.detail || "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const generate = () => {
    // 12-char password — guarantees a letter + digit so backend rule passes.
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    // Force at least one letter + one digit
    p = "C" + p.slice(1, -1) + "9";
    setPw(p);
  };

  return (
    <Dialog open={!!user} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-white border-chaioz-line text-chaioz-teal sm:max-w-md" data-testid="user-reset-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Reset password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-chaioz-teal/70">Force-set a new password for <strong>{user.email}</strong>. Communicate it to them through a private channel — Chaioz will not email the new password.</p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-chaioz-teal/80 text-xs">New password</Label>
            <div className="flex gap-2 mt-1">
              <Input value={pw} onChange={(e) => setPw(e.target.value)} type="text" minLength={8} required className="bg-chaioz-cream border-chaioz-line font-mono flex-1" data-testid="user-reset-pw" />
              <Button type="button" variant="outline" onClick={generate} className="bg-white" data-testid="user-reset-generate">Generate</Button>
            </div>
            <p className="text-[11px] text-chaioz-teal/50 mt-1">8+ chars, must include a letter and a digit.</p>
          </div>
          {err && <p className="text-sm text-red-500" data-testid="user-reset-error">{err}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="bg-white">Cancel</Button>
            <Button type="submit" disabled={busy || pw.length < 8} data-testid="user-reset-submit" className="bg-chaioz-saffron text-chaioz-teal hover:bg-chaioz-saffronHover hover:text-chaioz-teal">
              {busy ? "Resetting…" : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
