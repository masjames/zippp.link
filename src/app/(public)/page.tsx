import ThemeSwitcher from "@/components/ThemeSwitcher";
import DemoCard from "@/components/DemoCard";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--border)] sticky top-0 bg-[var(--bg)] z-10">
        <nav className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-heading font-black text-xl tracking-tight">
            ZIPPP.LINK
          </Link>
          <div className="flex items-center gap-6 text-sm font-medium text-[var(--text)]">
            <Link href="#demo" className="hover:opacity-80">
              View Demo
            </Link>
            <Link href="/api/auth/signin/google" id="google-login-nav" className="hover:opacity-80">
              Login
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-6 leading-tight text-[var(--text)]">
              Turn Instagram followers into WhatsApp orders in 2 minutes
            </h1>
            <p className="text-lg text-[var(--muted)] mb-8 max-w-xl">
              Stop juggling DMs, payment screenshots, and a Google Sheet 6 versions behind.
              One link, qty + auto total, straight to WhatsApp.
            </p>

            <div className="flex flex-wrap gap-4 items-center mb-8">
              <Link
                href="/app/dashboard"
                id="create-store-cta"
                className="px-6 py-3 bg-[var(--black)] text-[var(--white)] font-semibold rounded hover:opacity-90 transition-all text-center"
              >
                Create my WhatsApp store, free
              </Link>
              <Link
                href="/api/auth/signin/google"
                id="google-login"
                role="button"
                className="px-6 py-3 bg-[var(--white)] text-[var(--text)] border border-[var(--black)] font-semibold rounded hover:bg-[var(--bg)] transition-all text-center"
              >
                Continue with Google
              </Link>
            </div>

            <div className="text-xs text-[var(--muted)] space-y-1">
              <p>23/100 spots claimed • 247 sellers in 12 countries</p>
              <p>Free for early believers, no credit card required.</p>
            </div>

            {/* Interactive Theme Switcher */}
            <ThemeSwitcher />

            {/* Live Preview Demo Card */}
            <div id="demo" className="mt-12">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] mb-4 font-accent">
                LIVE DEMO CARD
              </h3>
              <DemoCard />
            </div>
          </div>
        </section>

        {/* Tools strip */}
        <section id="tools" className="py-12 border-b border-[var(--border)] bg-[var(--bg)]/50">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-6">
              Works with tools you already use
            </h2>
            <div className="flex justify-center gap-8 text-[var(--muted)] font-medium">
              <span>Google Sheets</span>
              <span>Shopify</span>
              <span>Zapier</span>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section id="problem" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <span className="eyebrow font-accent text-lg font-bold text-[var(--text)]">WHY ZIPPP</span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-4 mt-2">
              DMs are not built for commerce
            </h2>
            <p className="text-[var(--muted)] mb-8">
              Juggling manual pricing queries and order detail consolidation kills your conversion rates.
            </p>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold text-base mb-2">DM Overload</h3>
                <p className="text-sm text-[var(--muted)]">Answering the same &quot;price?&quot; questions 50 times a day.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold text-base mb-2">Math Errors</h3>
                <p className="text-sm text-[var(--muted)]">Manually calculating totals, taxes, and shipping rates.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold text-base mb-2">Out of Sync</h3>
                <p className="text-sm text-[var(--muted)]">Forgetting to cross out sold items, leading to angry buyers.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="solution" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <span className="eyebrow font-accent text-lg font-bold text-[var(--text)]">HOW IT WORKS</span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-8 mt-2">
              Your store is online in three steps
            </h2>
            <ol className="space-y-6 list-decimal pl-5 text-[var(--text)]">
              <li>
                <strong>Import products:</strong> Paste Google Sheets link or Shopify URL.
              </li>
              <li>
                <strong>Share your link:</strong> Put it in your Instagram bio or send it directly.
              </li>
              <li>
                <strong>Receive orders:</strong> Buyers customize quantity, click checkout, and message you a auto-totaled text format on WhatsApp.
              </li>
            </ol>
          </div>
        </section>

        {/* Outcomes Grid */}
        <section id="features" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <span className="eyebrow font-accent text-lg font-bold text-[var(--text)]">OUTCOMES</span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-8 mt-2">
              Designed for high conversion
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold mb-2">2-Minute Setup</h3>
                <p className="text-sm text-[var(--muted)]">No domains, no hosting configurations, no complex setups.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold mb-2">Instant Sheets Sync</h3>
                <p className="text-sm text-[var(--muted)]">Every order is appended automatically to your Google Sheets tab.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold mb-2">Rich Context Orders</h3>
                <p className="text-sm text-[var(--muted)]">Know exactly what the buyer wants without asking questions.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded">
                <h3 className="font-bold mb-2">Zapier Webhooks</h3>
                <p className="text-sm text-[var(--muted)]">Forward order events to shipping providers or CRMs easily.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <span className="eyebrow font-accent text-lg font-bold text-[var(--text)]">PRICING</span>
            <h2 className="text-3xl font-extrabold tracking-tight mb-8 mt-2">
              Pay what you want. Really.
            </h2>
            <div className="grid gap-6 sm:grid-cols-4">
              <div className="p-4 border border-[var(--border)] rounded flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm">Early Believer</h3>
                  <div className="text-2xl font-black my-2">$0</div>
                </div>
                <p className="text-xs text-[var(--muted)]">Free forever for up to 5 products.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm">Coffee</h3>
                  <div className="text-2xl font-black my-2">$5/yr</div>
                </div>
                <p className="text-xs text-[var(--muted)]">Support the developer, unlock themes.</p>
              </div>
              <div className="p-4 border border-2 border-[var(--text)] rounded flex flex-col justify-between relative">
                <span className="absolute -top-3 left-4 bg-[var(--text)] text-[var(--white)] text-[10px] font-bold px-2 py-0.5 rounded font-accent">
                  Most Popular
                </span>
                <div>
                  <h3 className="font-bold text-sm mt-1">Pro</h3>
                  <div className="text-2xl font-black my-2">$19/yr</div>
                </div>
                <p className="text-xs text-[var(--muted)]">Unlock sheets integrations and custom branding.</p>
              </div>
              <div className="p-4 border border-[var(--border)] rounded flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-sm">Lifetime</h3>
                  <div className="text-2xl font-black my-2">$59</div>
                </div>
                <p className="text-xs text-[var(--muted)]">Pay once, own forever. All future features.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Letter */}
        <section id="founder" className="py-16 border-b border-[var(--border)]">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl font-bold mb-4">Letter from the Founder</h2>
            <div className="space-y-4 text-sm text-[var(--text)] max-w-xl">
              <p>Hi, I&apos;m Lucky. I built Zippp from Malang, Indonesia.</p>
              <p>
                As a developer, I saw local thrift shops and bakers spend half their day answering
                DMs asking &quot;price?&quot; or calculating order totals.
              </p>
              <p>
                Zippp is made to keep it simple: one page, instant quantity controls, auto totals,
                and direct message dispatch. If you need any help, reach out to me.
              </p>
              <div className="pt-2">
                <span className="font-bold">Lucky</span> — Malang, ID
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 flex justify-between items-center text-xs text-[var(--muted)]">
          <span>&copy; 2026 Zippp.link. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="hover:underline">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
