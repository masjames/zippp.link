"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ZCmsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  // Route security check
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.role !== "ADMIN") {
          router.push("/app/dashboard?error=AccessDenied");
        }
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between">
        <div>
          <div className="font-heading font-black text-lg tracking-tight mb-8">
            Z-CMS ADMIN
          </div>
          <nav className="space-y-2">
            <Link
              href="/z-cms"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              href="/z-cms/pages/landing"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Pages
            </Link>
            <Link
              href="/z-cms/blog"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Blog
            </Link>
            <Link
              href="/z-cms/users"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Users
            </Link>
            <Link
              href="/z-cms/announcements"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Announce
            </Link>
            <Link
              href="/z-cms/notifications"
              className="block px-4 py-2 text-sm font-semibold rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Notifs
            </Link>
          </nav>
        </div>
        <div>
          <Link
            href="/app/dashboard"
            className="block text-center py-2 px-4 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Seller Area
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
