"use client";

import { useState } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function DemoCard() {
  const [products, setProducts] = useState<Product[]>([
    { id: "coffee", name: "Coffee Beans", price: 10, qty: 0 },
    { id: "dripper", name: "V60 Dripper", price: 25, qty: 0 },
  ]);

  const adjustQty = (id: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, qty: Math.max(0, p.qty + delta) } : p
      )
    );
  };

  const totalItems = products.reduce((sum, p) => sum + p.qty, 0);
  const totalAmount = products.reduce((sum, p) => sum + p.qty * p.price, 0);

  const handleOrder = () => {
    const activeItems = products.filter((p) => p.qty > 0);
    if (activeItems.length === 0) return;

    const lines = activeItems.map((p) => `${p.qty}x ${p.name} - $${(p.qty * p.price).toFixed(2)}`);
    const text = `Hi, I want to order:\n${lines.join("\n")}\n\nTotal: $${totalAmount.toFixed(2)} 🛍️\nThank you!`;
    const url = `https://wa.me/123456789?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="demo-card w-full max-w-sm border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--white)] text-[var(--text)] transition-all">
      <h2 className="text-sm font-semibold p-4 border-b border-[var(--border)]">
        Jane&apos;s Thrift, live preview
      </h2>
      <div className="divide-y divide-[var(--border)]">
        {products.map((p) => (
          <div
            key={p.id}
            data-testid="demo-product-card"
            className="demo-product-card flex items-center justify-between gap-3 p-4"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{p.name}</div>
              <div className="text-xs text-[var(--muted)]">${p.price.toFixed(2)}</div>
            </div>
            
            <div className="flex items-center gap-2">
              {p.qty === 0 ? (
                <button
                  onClick={() => adjustQty(p.id, 1)}
                  className="px-3 py-1 text-xs font-semibold border border-[var(--border)] rounded hover:bg-[var(--bg)] cursor-pointer"
                >
                  + Add
                </button>
              ) : (
                <div className="qty flex items-center gap-2">
                  <button
                    onClick={() => adjustQty(p.id, -1)}
                    className="w-7 h-7 flex items-center justify-center border border-[var(--border)] bg-[var(--white)] rounded text-sm font-medium hover:bg-[var(--bg)] cursor-pointer"
                    aria-label="Decrease quantity"
                  >
                    -
                  </button>
                  <span className="w-4 text-center text-sm font-medium">{p.qty}</span>
                  <button
                    onClick={() => adjustQty(p.id, 1)}
                    className="w-7 h-7 flex items-center justify-center border border-[var(--border)] bg-[var(--white)] rounded text-sm font-medium hover:bg-[var(--bg)] cursor-pointer"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {totalItems > 0 && (
        <div
          data-testid="demo-cart-bar"
          className="demo-cart-bar p-4 bg-[var(--bg)]/50 border-t border-[var(--border)] flex justify-between items-center transition-all"
        >
          <div className="text-sm font-medium">
            {totalItems} {totalItems === 1 ? "item" : "items"}
          </div>
          <div className="font-bold text-sm">Total: ${totalAmount.toFixed(2)}</div>
        </div>
      )}
      
      <div className="p-4 border-t border-[var(--border)]">
        <button
          onClick={handleOrder}
          disabled={totalItems === 0}
          className="w-full py-2.5 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          id="wa-order-btn"
        >
          Order on WhatsApp
        </button>
      </div>
    </div>
  );
}
