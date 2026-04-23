import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const CartCtx = createContext(null);
const KEY = 'cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(KEY);
        if (raw) setItems(JSON.parse(raw));
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (hydrated) SecureStore.setItemAsync(KEY, JSON.stringify(items)).catch(() => {});
  }, [items, hydrated]);

  const add = (menuItem, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.item_id === menuItem.id);
      const price = menuItem.price;
      if (existing) {
        return prev.map((p) =>
          p.item_id === menuItem.id ? { ...p, qty: p.qty + qty, line_total: (p.qty + qty) * price } : p,
        );
      }
      return [
        ...prev,
        {
          item_id: menuItem.id,
          name: menuItem.name,
          price,
          qty,
          size: null,
          addons: [],
          notes: null,
          line_total: qty * price,
        },
      ];
    });
  };

  const remove = (item_id) => setItems((prev) => prev.filter((p) => p.item_id !== item_id));

  const changeQty = (item_id, delta) =>
    setItems((prev) =>
      prev
        .map((p) =>
          p.item_id === item_id ? { ...p, qty: Math.max(0, p.qty + delta), line_total: Math.max(0, p.qty + delta) * p.price } : p,
        )
        .filter((p) => p.qty > 0),
    );

  const clear = () => setItems([]);

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartCtx.Provider value={{ items, add, remove, changeQty, clear, subtotal, count }}>
      {children}
    </CartCtx.Provider>
  );
}

export const useCart = () => useContext(CartCtx);
