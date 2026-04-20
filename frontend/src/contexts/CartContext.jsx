import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";

const CartCtx = createContext(null);
const KEY = "chaioz_cart_v1";
const CONTACT_KEY = "chaioz_cart_contact_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [contact, setContact] = useState(() => {
    try {
      const raw = localStorage.getItem(CONTACT_KEY);
      return raw ? JSON.parse(raw) : { email: "", phone: "", name: "" };
    } catch {
      return { email: "", phone: "", name: "" };
    }
  });
  const [open, setOpen] = useState(false);
  const snapshotTimer = useRef(null);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(CONTACT_KEY, JSON.stringify(contact));
  }, [contact]);

  // Abandonment tracking: post snapshot when cart changes and we have contact info
  useEffect(() => {
    if (items.length === 0) return;
    if (!contact.email && !contact.phone) return;
    clearTimeout(snapshotTimer.current);
    snapshotTimer.current = setTimeout(() => {
      api
        .post("/cart/snapshot", {
          email: contact.email || null,
          phone: contact.phone || null,
          name: contact.name || null,
          items: items.map((i) => ({
            item_id: i.item_id,
            name: i.name,
            qty: i.qty,
            line_total: i.line_total,
          })),
        })
        .catch(() => {});
    }, 3000);
    return () => clearTimeout(snapshotTimer.current);
  }, [items, contact]);

  const addItem = (line) => {
    setItems((prev) => [...prev, { ...line, _key: `${line.item_id}-${Date.now()}-${Math.random()}` }]);
    setOpen(true);
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((it) =>
        it._key === key ? { ...it, qty, line_total: Number((it.price * qty).toFixed(2)) } : it
      )
    );
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i._key !== key));
  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + Number(i.line_total || 0), 0);
    return { subtotal: Number(subtotal.toFixed(2)), count: items.reduce((s, i) => s + i.qty, 0) };
  }, [items]);

  return (
    <CartCtx.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clear,
        totals,
        open,
        setOpen,
        contact,
        setContact,
      }}
    >
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
