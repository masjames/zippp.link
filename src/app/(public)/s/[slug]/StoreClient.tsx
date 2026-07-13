"use client";

import { useState } from "react";
import Link from "next/link";

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  qty: number;
}

interface StoreClientProps {
  storeTitle: string;
  storeDescription: string;
  waNumber: string;
  products: Product[];
}

export default function StoreClient({
  storeTitle,
  storeDescription,
  waNumber,
  products,
}: StoreClientProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const adjustQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const updated = prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.qty + delta;
          return { ...item, qty: newQty };
        }
        return item;
      });

      const filtered = updated.filter((item) => item.qty > 0);

      // Auto close modal if cart is empty
      if (filtered.length === 0) {
        setIsModalOpen(false);
      }

      return filtered;
    });
  };

  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = parseFloat(
    cart.reduce((sum, item) => sum + item.qty * item.product.price, 0).toFixed(2)
  );

  // WhatsApp Redirect Message Builder
  let msg = "Hi, I want to order:\n";
  cart.forEach((item) => {
    msg += `${item.qty}x ${item.product.name} - $${(item.product.price * item.qty).toFixed(2)}\n`;
  });
  msg += `\nTotal: $${totalAmount.toFixed(2)} 🛍️\nThank you!`;
  const waUrl = totalItems > 0 ? `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}` : "#";

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* Store Header */}
      <header className="border-b border-[var(--border)] py-6 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4">
          <h1 data-testid="store-header" className="text-3xl font-black tracking-tight mb-2">
            {storeTitle}
          </h1>
          <p data-testid="store-description" className="text-sm text-[var(--muted)]">
            {storeDescription}
          </p>
        </div>
      </header>

      {/* Main Content / Product Grid */}
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <div className="grid gap-6 sm:grid-cols-2">
          {products.map((product) => {
            const hasError = imageErrors[product.id];
            return (
              <div
                key={product.id}
                data-testid="product-card"
                className="product-card border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--white)] flex flex-col justify-between"
              >
                <div>
                  {product.imageUrl && !hasError ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      onError={() => setImageErrors((prev) => ({ ...prev, [product.id]: true }))}
                      className="w-full h-48 object-cover border-b border-[var(--border)]"
                    />
                  ) : (
                    <div className="fallback-img w-full h-48 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[var(--muted)] font-medium border-b border-[var(--border)]">
                      ☕ No Image
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="product-title font-bold text-base mb-1">{product.name}</h4>
                    <p className="product-price text-sm text-[var(--muted)]">${product.price.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 border-t border-[var(--border)]">
                  <button
                    onClick={() => addToCart(product)}
                    className="w-full py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Branding Footer */}
      <footer data-testid="branding-footer" className="border-t border-[var(--border)] py-8 text-center text-xs text-[var(--muted)] bg-[var(--bg)] mb-20">
        <Link href="/" className="hover:underline font-semibold">
          Powered by Zippp
        </Link>
      </footer>

      {/* Inline Cart Bar */}
      {totalItems > 0 && (
        <div
          data-testid="cart-bar"
          className="cart-bar fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--black)] text-[var(--white)] px-4 py-4 flex justify-between items-center z-40"
        >
          <div className="text-sm font-medium">
            <span>{totalItems} {totalItems === 1 ? "item" : "items"}</span>
            <span className="mx-2">&middot;</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>
          <button
            id="view-cart-btn"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-[var(--white)] text-[var(--black)] font-semibold rounded text-xs hover:opacity-90 cursor-pointer"
          >
            View Cart
          </button>
        </div>
      )}

      {/* Bottom Sheet Cart Modal Overlay */}
      <div
        data-testid="cart-modal"
        onClick={() => setIsModalOpen(false)}
        className={`cart-modal fixed inset-0 bg-black/50 z-50 flex items-end justify-center transition-all duration-300 ${
          isModalOpen ? "block" : "hidden"
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[var(--bg)] border-t border-[var(--border)] rounded-t-xl p-6 max-h-[80vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-heading font-black text-lg">Your Cart</h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="text-xl font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {cart.length === 0 ? (
              <p className="py-4 text-sm text-[var(--muted)]">Your cart is empty.</p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  data-testid="cart-item"
                  className="cart-item py-4 flex justify-between items-center gap-4"
                >
                  <div>
                    <strong className="text-sm font-semibold">{item.product.name}</strong>
                    <div className="text-xs text-[var(--muted)]">
                      ${item.product.price.toFixed(2)} each
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustQty(item.product.id, -1)}
                      className="w-7 h-7 flex items-center justify-center border border-[var(--border)] bg-[var(--white)] rounded text-sm font-medium hover:bg-[var(--bg)] cursor-pointer"
                    >
                      -
                    </button>
                    <span
                      data-testid="quantity-value"
                      className="quantity-value w-4 text-center text-sm font-semibold"
                    >
                      {item.qty}
                    </span>
                    <button
                      onClick={() => adjustQty(item.product.id, 1)}
                      className="w-7 h-7 flex items-center justify-center border border-[var(--border)] bg-[var(--white)] rounded text-sm font-medium hover:bg-[var(--bg)] cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[var(--border)] py-6 mt-6 flex justify-between items-center">
            <span className="font-semibold text-sm">Subtotal</span>
            <span
              data-testid="cart-subtotal"
              className="cart-subtotal font-bold text-lg"
            >
              ${totalAmount.toFixed(2)}
            </span>
          </div>

          <a
            href={waUrl}
            onClick={(e) => {
              if (totalItems === 0) e.preventDefault();
            }}
            className={`order-wa-btn block w-full py-3 text-center rounded font-bold transition-all ${
              totalItems === 0
                ? "disabled bg-zinc-200 dark:bg-zinc-800 text-[var(--muted)] pointer-events-none opacity-50"
                : "bg-[#25d366] text-white hover:opacity-90"
            }`}
          >
            Order on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
