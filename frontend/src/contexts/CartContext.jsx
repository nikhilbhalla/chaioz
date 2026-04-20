import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);
const KEY = "chaioz_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (line) => {
    setItems((prev) => [...prev, { ...line, _key: `${line.item_id}-${Date.now()}-${Math.random()}` }]);
    setOpen(true);
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) return removeItem(key);
    setItems((prev) =>
      prev.map((it) =>
        it._key === key
          ? { ...it, qty, line_total: Number((it.price * qty).toFixed(2)) }
          : it
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
    <CartCtx.Provider value={{ items, addItem, updateQty, removeItem, clear, totals, open, setOpen }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
