"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "General" | "Branding" | "Integrations" | "Billing";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("General");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [upsellStep, setUpsellStep] = useState<number | null>(null); // null, 1, 2
  const [priceInput, setPriceInput] = useState("10");

  // Form states — General
  const [storeName, setStoreName] = useState("");
  const [waNumber, setWaNumber] = useState("");

  // Form states — Branding
  const [brandingOption, setBrandingOption] = useState<"visible" | "hidden">("visible");
  const [customWaMessage, setCustomWaMessage] = useState("");

  // Form states — Integrations
  const [shopifyUrl, setShopifyUrl] = useState("");
  const [sheetsSpreadsheet, setSheetsSpreadsheet] = useState("");
  const [sheetsWebhook, setSheetsWebhook] = useState("");

  const handleUnlockClick = () => {
    setUpsellStep(1);
  };

  const handleStep1Yes = () => {
    setUpsellStep(2);
  };

  const handleStep2Pay = () => {
    setIsUnlocked(true);
    setUpsellStep(null);
  };

  const handleDismiss = () => {
    setUpsellStep(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] font-sans">
      {/* Header */}
      <header className="border-b border-[var(--border)] py-4 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 flex justify-between items-center">
          <Link href="/app/dashboard" className="font-heading font-black text-lg tracking-tight">
            ZIPPP.LINK
          </Link>
          <Link href="/app/dashboard" className="text-sm font-semibold hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Main Settings Container */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-6">Store Settings</h1>

        {/* Lock Banner / Message for Free tier */}
        {!isUnlocked && (
          <div
            data-testid="settings-lock-message"
            className="settings-lock-message p-6 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 rounded mb-8 text-center"
          >
            <h3 className="font-bold mb-2">Unlock all settings with your Paid plan</h3>
            <p className="text-sm text-[var(--muted)] mb-4">
              Shopify import, Sheets automation, and custom branding are locked on the Free tier.
            </p>
            <button
              onClick={handleUnlockClick}
              className="px-6 py-2.5 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
            >
              Name Your Price &amp; Unlock
            </button>
          </div>
        )}

        {/* Tabs Headers */}
        <div className="flex border-b border-[var(--border)] gap-2 mb-8 overflow-x-auto">
          {(["General", "Branding", "Integrations", "Billing"] as Tab[]).map((tab) => (
            <button
              key={tab}
              data-testid={`tab-${tab.toLowerCase()}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === tab
                  ? "border-[var(--black)] text-[var(--text)]"
                  : "border-transparent text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-[var(--white)] border border-[var(--border)] rounded-lg p-6">
          {activeTab === "General" && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg mb-4">General Settings</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">Store Name</label>
                <input
                  type="text"
                  name="storeName"
                  placeholder="Coffee Store"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  name="waNumber"
                  placeholder="6281234567890"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)]"
                />
              </div>
              <button
                className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
              >
                Save
              </button>
            </div>
          )}

          {activeTab === "Branding" && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg mb-4">Custom Branding</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">Branding Footer Visibility</label>
                <div className="flex gap-2">
                  <button
                    data-testid="branding-toggle-visible"
                    onClick={() => isUnlocked && setBrandingOption("visible")}
                    className={`px-4 py-2 text-xs font-semibold rounded border cursor-pointer transition-all ${
                      brandingOption === "visible"
                        ? "bg-[var(--black)] text-[var(--white)] border-[var(--black)]"
                        : "bg-[var(--white)] text-[var(--text)] border-[var(--border)]"
                    } disabled:opacity-50`}
                    disabled={!isUnlocked}
                  >
                    Visible
                  </button>
                  <button
                    data-testid="branding-toggle-hidden"
                    onClick={() => isUnlocked && setBrandingOption("hidden")}
                    className={`px-4 py-2 text-xs font-semibold rounded border cursor-pointer transition-all ${
                      brandingOption === "hidden"
                        ? "bg-[var(--black)] text-[var(--white)] border-[var(--black)]"
                        : "bg-[var(--white)] text-[var(--text)] border-[var(--border)]"
                    } disabled:opacity-50`}
                    disabled={!isUnlocked}
                  >
                    Hidden
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Custom WhatsApp Message Template</label>
                <textarea
                  name="customWaMessage"
                  data-testid="custom-wa-message-input"
                  value={customWaMessage}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  placeholder="Hi, I want to order..."
                  className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] h-24 disabled:opacity-50"
                  disabled={!isUnlocked}
                />
              </div>
              <button
                className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm disabled:opacity-50 cursor-pointer"
                disabled={!isUnlocked}
              >
                Save
              </button>
            </div>
          )}

          {activeTab === "Integrations" && (
            <div className="space-y-6">
              <h3 className="font-bold text-lg mb-4">Integrations</h3>

              {/* Shopify */}
              <div className="space-y-3 pb-6 border-b border-[var(--border)]">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted)]">Shopify Sync</h4>
                <div>
                  <label className="block text-sm font-semibold mb-2">Shopify Store URL</label>
                  <input
                    type="text"
                    name="shopifyStoreUrl"
                    data-testid="shopify-url-input"
                    value={shopifyUrl}
                    onChange={(e) => setShopifyUrl(e.target.value)}
                    placeholder="mystore.myshopify.com"
                    className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] disabled:opacity-50"
                    disabled={!isUnlocked}
                  />
                </div>
                <button
                  className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm disabled:opacity-50 cursor-pointer"
                  disabled={!isUnlocked}
                >
                  Import products
                </button>
              </div>

              {/* Google Sheets */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-[var(--muted)]">Google Sheets</h4>
                <div>
                  <label className="block text-sm font-semibold mb-2">Spreadsheet URL</label>
                  <input
                    type="text"
                    name="sheetsSpreadsheetUrl"
                    data-testid="sheets-url-input"
                    value={sheetsSpreadsheet}
                    onChange={(e) => setSheetsSpreadsheet(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] disabled:opacity-50"
                    disabled={!isUnlocked}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Webhook URL</label>
                  <input
                    type="text"
                    name="sheetsWebhookUrl"
                    data-testid="sheets-webhook-input"
                    value={sheetsWebhook}
                    onChange={(e) => setSheetsWebhook(e.target.value)}
                    placeholder="https://zapier.com/hooks/catch/..."
                    className="w-full p-2 border border-[var(--border)] rounded bg-[var(--bg)] text-[var(--text)] disabled:opacity-50"
                    disabled={!isUnlocked}
                  />
                </div>
                <button
                  className="px-4 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm disabled:opacity-50 cursor-pointer"
                  disabled={!isUnlocked}
                >
                  Save &amp; test connection
                </button>
              </div>
            </div>
          )}

          {activeTab === "Billing" && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg mb-4">Billing</h3>
              <div className="p-4 border border-[var(--border)] rounded bg-[var(--bg)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-sm">Current Plan</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                    {isUnlocked ? "PAID" : "FREE"}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {isUnlocked
                    ? "You are on the Paid plan. All features are unlocked."
                    : "You are on the Free plan. Upgrade to unlock Sheets, Shopify, and custom branding."}
                </p>
              </div>
              {!isUnlocked && (
                <button
                  onClick={handleUnlockClick}
                  className="px-6 py-2.5 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
                >
                  Name Your Price &amp; Upgrade
                </button>
              )}
              {isUnlocked && (
                <p className="text-sm text-[var(--muted)]">
                  Manage your subscription via your payment provider portal.
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Upsell Dialog Overlay */}
      {upsellStep !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-[var(--bg)] border border-[var(--border)] rounded-lg p-6 shadow-xl relative">
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 text-lg font-bold hover:opacity-85 cursor-pointer"
            >
              ✕ Dismiss
            </button>

            {upsellStep === 1 && (
              <div className="text-center mt-4">
                <h3 className="font-heading font-black text-xl mb-3">Unlock Premium Settings</h3>
                <p className="text-sm text-[var(--muted)] mb-6">
                  Are you enjoying Zippp and ready to automate your store with sheets and custom branding?
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleStep1Yes}
                    className="px-6 py-2 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
                  >
                    Yes, love it
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-6 py-2 bg-[var(--white)] text-[var(--text)] border border-[var(--border)] font-semibold rounded text-sm hover:bg-[var(--bg)] cursor-pointer"
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}

            {upsellStep === 2 && (
              <div className="text-center mt-4">
                <h3 className="font-heading font-black text-xl mb-3">Name Your Price</h3>
                <p className="text-sm text-[var(--muted)] mb-6">
                  Zippp runs on pay-what-you-want support. Enter any annual contribution (min $1/yr) to unlock everything.
                </p>
                <div className="mb-6 max-w-[200px] mx-auto">
                  <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-[var(--muted)] sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="price"
                      data-testid="upsell-price-input"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="block w-full rounded border-[var(--border)] pl-7 pr-12 focus:border-[var(--black)] focus:ring-[var(--black)] sm:text-sm p-2 bg-[var(--bg)] text-[var(--text)] font-bold text-center"
                      placeholder="10"
                      min="1"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-[var(--muted)] sm:text-sm">/yr</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleStep2Pay}
                  className="w-full py-2.5 bg-[var(--black)] text-[var(--white)] font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
                >
                  Pay &amp; Unlock All
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
