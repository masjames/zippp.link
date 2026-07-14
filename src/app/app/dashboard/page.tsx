"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Product {
  id: number;
  name: string;
  price: number | string;
  imageUrl?: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  role: "ADMIN" | "SELLER";
  plan: "FREE" | "PAID";
  store: {
    id: number;
    slug: string;
    title: string;
    viewsCount: number;
    waClicksCount: number;
  } | null;
}

interface EditingProduct extends Product {
  isNew?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isUpsellOpen, setIsUpsellOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const plan = user?.plan ?? "FREE";
  const store = user?.store ?? null;

  // Load user + products on mount
  useEffect(() => {
    const dismissed = localStorage.getItem("banner-dismissed") === "true";
    setIsBannerDismissed(dismissed);

    const loadData = async () => {
      try {
        const [userRes, productsRes] = await Promise.all([
          fetch("/api/user"),
          fetch("/api/products"),
        ]);
        if (userRes.ok) {
          const userData = await userRes.json();
          setUser(userData);
        }
        if (productsRes.ok) {
          const prods = await productsRes.json();
          setProducts(prods);
        }
      } catch {
        // Fallback: keep empty state
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
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
    // Open edit modal for new product
    setEditingProduct({ id: 0, name: "", price: "", imageUrl: null, isNew: true });
    setSaveError(null);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setSaveError(null);
  };

  const handleDeleteProduct = async (id: number) => {
    // Optimistic UI
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
    } catch {
      // Silently ignore — optimistic delete already applied
    }
  };

  const handleSaveProduct = useCallback(async () => {
    if (!editingProduct) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const isNew = editingProduct.isNew;
      const method = isNew ? "POST" : "PUT";
      const url = isNew ? "/api/products" : `/api/products/${editingProduct.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name,
          price: editingProduct.price,
          imageUrl: editingProduct.imageUrl,
        }),
      });

      const saved = await res.json();

      if (isNew) {
        setProducts((prev) => [...prev, saved]);
      } else {
        setProducts((prev) =>
          prev.map((p) => (p.id === saved.id ? saved : p))
        );
      }
      setEditingProduct(null);
    } catch {
      setSaveError("Failed to save. Try again.");
    } finally {
      setIsSaving(false);
    }
  }, [editingProduct]);

  const handleLogout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
  };

  const views = store?.viewsCount ?? 120;
  const clicks = store?.waClicksCount ?? 45;
  const storeUrl = store ? `${window.location.origin}/s/${store.slug}` : null;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans relative">
      {/* Navigation */}
      <header className="border-b border-[var(--border)] py-4 bg-[var(--bg)]">
        <div className="max-w-4xl mx-auto px-4 flex justify-between items-center relative">
          <Link href="/" className="font-heading font-black text-lg tracking-tight">
            ZIPPP.LINK
          </Link>

          <div className="flex items-center gap-4">
            {/* Store link badge */}
            {store && (
              <a
                href={`/s/${store.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 border border-[var(--border)] rounded hover:bg-[var(--bg)] transition-all"
              >
                View Store ↗
              </a>
            )}

            {/* User Menu / Avatar */}
            <div className="relative">
              <button
                data-testid="user-menu-button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-10 h-10 rounded-full border border-[var(--border)] bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold cursor-pointer hover:bg-[var(--bg)] transition-all"
              >
                {user?.name?.[0]?.toUpperCase() ?? "?"}
              </button>

              {isUserMenuOpen && (
                <div
                  data-testid="user-menu-dropdown"
                  className="user-menu-dropdown absolute right-0 mt-2 w-56 border border-[var(--border)] bg-[var(--bg)] rounded shadow-lg p-2 z-50"
                >
                  {user && (
                    <div className="px-4 py-2 border-b border-[var(--border)] mb-2">
                      <p className="text-xs font-bold truncate">{user.name}</p>
                      <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 mt-1 inline-block">
                        {user.plan}
                      </span>
                    </div>
                  )}
                  <Link
                    href="/app/settings"
                    id="settings-link"
                    className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    onClick={() => setIsUserMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer text-red-500"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
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

        <div className="flex justify-between items-start mb-8">
          <h1 className="text-3xl font-black">Dashboard</h1>
          {isLoading && (
            <span className="text-xs text-[var(--muted)] animate-pulse">Loading…</span>
          )}
        </div>

        {/* No store yet — prompt to setup */}
        {!isLoading && !store && (
          <div className="mb-8 p-6 border-2 border-dashed border-[var(--border)] rounded-lg text-center">
            <h2 className="font-bold text-lg mb-2">Set up your store</h2>
            <p className="text-sm text-[var(--muted)] mb-4">
              Add your store name and WhatsApp number in Settings to get your store link.
            </p>
            <Link
              href="/app/settings"
              className="inline-block px-6 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90"
            >
              Go to Settings →
            </Link>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <div className="p-6 border border-[var(--border)] rounded bg-[var(--white)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              Views
            </h3>
            <div data-testid="stat-views" className="stat-views text-3xl font-black">
              {views.toLocaleString()}
            </div>
          </div>
          <div className="p-6 border border-[var(--border)] rounded bg-[var(--white)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-2">
              WhatsApp Clicks
            </h3>
            <div data-testid="stat-clicks" className="stat-clicks text-3xl font-black">
              {clicks.toLocaleString()}
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

        {/* Store link row */}
        {storeUrl && (
          <div className="mb-6 p-4 border border-[var(--border)] rounded bg-[var(--white)] flex flex-wrap gap-3 items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Your Store Link</p>
              <p className="font-mono text-sm font-semibold break-all">{storeUrl}</p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(storeUrl)}
              className="px-4 py-2 border border-[var(--border)] rounded text-xs font-semibold hover:bg-[var(--bg)] cursor-pointer shrink-0"
            >
              Copy Link
            </button>
          </div>
        )}

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
              {products.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-sm text-[var(--muted)]">
                    No products yet. Click &ldquo;+ Add&rdquo; to create one.
                  </td>
                </tr>
              )}
              {products.map((p) => (
                <tr
                  key={p.id}
                  data-testid="product-row"
                  className="product-row border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg)]/30"
                >
                  <td className="p-4 text-sm font-semibold">{p.name}</td>
                  <td className="p-4 text-sm text-[var(--muted)]">
                    ${parseFloat(String(p.price)).toFixed(2)}
                  </td>
                  <td className="p-4 text-sm text-right space-x-2">
                    <button
                      onClick={() => handleEditProduct(p)}
                      className="px-2 py-1 border border-[var(--border)] rounded hover:bg-[var(--bg)] cursor-pointer text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id)}
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

        {/* FREE plan limit hint */}
        {plan === "FREE" && products.length >= 5 && (
          <p className="text-xs text-[var(--muted)] mt-3 text-right">
            Free plan limit reached (5/5).{" "}
            <Link href="/app/settings#billing" className="underline font-semibold">
              Upgrade
            </Link>{" "}
            for unlimited products.
          </p>
        )}
      </main>

      {/* Edit / Add Product Modal */}
      {editingProduct !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            id="edit-product-modal"
            className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-lg p-6 shadow-xl"
          >
            <h3 className="font-heading font-black text-xl mb-5">
              {editingProduct.isNew ? "New Product" : "Edit Product"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Name</label>
                <input
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct((p) => p ? { ...p, name: e.target.value } : p)}
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                  placeholder="Coffee Beans"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct((p) => p ? { ...p, price: e.target.value } : p)}
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                  placeholder="10.99"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Image URL (optional)</label>
                <input
                  type="url"
                  value={editingProduct.imageUrl ?? ""}
                  onChange={(e) => setEditingProduct((p) => p ? { ...p, imageUrl: e.target.value } : p)}
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                  placeholder="https://..."
                />
              </div>
            </div>

            {saveError && (
              <p className="text-sm text-red-500 mt-3">{saveError}</p>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveProduct}
                disabled={isSaving || !editingProduct.name || !editingProduct.price}
                className="flex-1 py-2.5 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2.5 border border-[var(--border)] rounded font-semibold text-sm hover:bg-[var(--bg)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="flex gap-3 justify-center">
              <Link
                href="/app/settings"
                className="px-6 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90"
                onClick={() => setIsUpsellOpen(false)}
              >
                Upgrade Now
              </Link>
              <button
                onClick={() => setIsUpsellOpen(false)}
                className="px-6 py-2 border border-[var(--border)] font-semibold rounded text-sm hover:bg-[var(--bg)] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
