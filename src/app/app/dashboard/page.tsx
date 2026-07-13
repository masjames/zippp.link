"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  name: string;
  price: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<"FREE" | "PAID">("FREE");
  const [isBannerDismissed, setIsBannerDismissed] = useState(true); // default to true until hydration
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([
    { name: "Coffee Beans", price: 10.99 },
    { name: "V60 Dripper", price: 25.00 },
  ]);

  // Sync state with localStorage and fetch session on client mount
  useEffect(() => {
    setTimeout(() => {
      const dismissed = localStorage.getItem("banner-dismissed") === "true";
      setIsBannerDismissed(dismissed);
    }, 0);

    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.plan) {
          setPlan(data.user.plan);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismissBanner = () => {
    localStorage.setItem("banner-dismissed", "true");
    setIsBannerDismissed(true);
  };

  const handleAddProduct = () => {
    if (plan === "FREE" && products.length >= 5) {
      setIsUpsellOpen(true);
      return;
    }

    const nextId = products.length + 1;
    const newProduct: Product = {
      name: `New Product ${nextId}`,
      price: 15.00,
    };
    setProducts((prev) => [...prev, newProduct]);
  };

  const handleDeleteProduct = (name: string) => {
    setProducts((prev) => prev.filter((p) => p.name !== name));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans relative">
      {/* Navigation */}
      <header className="border-b border-[var(--border)] py-4 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center relative">
          <Link href="/" className="font-heading font-black text-lg tracking-tight">
            ZIPPP.LINK
          </Link>

          {/* User Menu / Avatar */}
          <div className="relative">
            <button
              data-testid="user-menu-button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-10 h-10 rounded-full border border-[var(--border)] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold cursor-pointer hover:bg-[var(--bg)] transition-all"
            >
              Avatar
            </button>

            {isUserMenuOpen && (
              <div
                data-testid="user-menu-dropdown"
                className="user-menu-dropdown absolute right-0 mt-2 w-48 border border-[var(--border)] bg-[var(--bg)] rounded shadow-lg p-2 z-50"
              >
                <Link
                  href="/app/settings"
                  id="settings-link"
                  className="block px-4 py-2 text-sm font-semibold rounded hover:bg-[var(--bg)] hover:text-[var(--text)]"
                >
                  Settings
                </Link>
                <button
                  onClick={() => router.push("/")}
                  className="w-full text-left px-4 py-2 text-sm font-semibold rounded hover:bg-[var(--bg)] hover:text-[var(--text)] cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Announcement Banner */}
        {!isBannerDismissed && (
          <div
            data-testid="announcement-banner"
            className="announcement-banner p-4 bg-yellow-100 border border-yellow-200 rounded text-yellow-800 mb-6 flex justify-between items-center"
          >
            <span>📢 New Features Released: Google Sheets Sync is now available!</span>
            <button
              data-testid="dismiss-announcement"
              onClick={handleDismissBanner}
              className="text-yellow-800 font-bold hover:opacity-80 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        <h1 className="text-3xl font-black mb-8">Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="p-6 border border-[var(--border)] rounded bg-[var(--white)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              Views
            </h3>
            <div data-testid="stat-views" className="stat-views text-3xl font-black">
              120
            </div>
          </div>
          <div className="p-6 border border-[var(--border)] rounded bg-[var(--white)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              WhatsApp Clicks
            </h3>
            <div data-testid="stat-clicks" className="stat-clicks text-3xl font-black">
              45
            </div>
          </div>
          <div className="p-6 border border-[var(--border)] rounded bg-[var(--white)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              Plan
            </h3>
            <div data-testid="stat-plan" className="stat-plan text-3xl font-black">
              {plan}
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Products</h2>
          <button
            onClick={handleAddProduct}
            className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
          >
            + Add
          </button>
        </div>

        {/* Products Table */}
        <div className="border border-[var(--border)] rounded overflow-x-auto bg-[var(--white)]">
          <table data-testid="products-table" className="products-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                <th className="p-4">Product</th>
                <th className="p-4">Price</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.name}
                  data-testid="product-row"
                  className="product-row border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)]/30"
                >
                  <td className="p-4 text-sm font-semibold">{p.name}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">${p.price.toFixed(2)}</td>
                  <td className="p-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => alert(`Editing ${p.name}`)}
                      className="px-2 py-1 border border-[var(--border)] rounded hover:bg-[var(--bg)] cursor-pointer text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.name)}
                      className="px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50 cursor-pointer text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Upsell Micro-commitment Popup Modal */}
      {isUpsellOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            id="upsell-modal"
            className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-lg p-6 shadow-xl text-center"
          >
            <h3 className="font-heading font-black text-xl mb-3">Limit Reached</h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              Free plans are limited to 5 products. Upgrade to Paid to add unlimited products!
            </p>
            <button
              onClick={() => setIsUpsellOpen(false)}
              className="px-6 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
