"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
  plan: "FREE" | "PAID";
  role: "SELLER" | "ADMIN";
  paidAmount?: string | null;
  expiresAt?: string | null;
  createdAt?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // Use mock data if API fails
        setUsers([
          { id: "mock-1", name: "Mock Seller", email: "seller@example.com", plan: "FREE", role: "SELLER" },
          { id: "mock-2", name: "Paid Seller", email: "paid@example.com", plan: "PAID", role: "SELLER", paidAmount: "19.00" },
          { id: "mock-3", name: "Mock Admin", email: "admin@zippp.link", plan: "PAID", role: "ADMIN" },
        ]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const paidCount = users.filter((u) => u.plan === "PAID").length;

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-black">User Accounts</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {users.length} total · {paidCount} paid
          </p>
        </div>
        {isLoading && <span className="text-xs text-zinc-400 animate-pulse">Loading…</span>}
      </div>

      <div className="mb-6 max-w-sm">
        <input
          type="search"
          data-testid="user-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email…"
          className="w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
        />
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 overflow-x-auto">
        <table data-testid="users-table" className="users-table w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Plan</th>
              <th className="p-4">Paid</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr
                key={u.id}
                className="border-b border-zinc-200 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <td className="p-4 text-sm font-semibold">{u.name ?? "—"}</td>
                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{u.email}</td>
                <td className="p-4 text-sm">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    u.role === "ADMIN"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-sm">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    u.plan === "PAID"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}>
                    {u.plan}
                  </span>
                </td>
                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                  {u.paidAmount ? `$${u.paidAmount}` : "—"}
                </td>
                <td className="p-4 text-sm text-zinc-500">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-sm text-zinc-500">
                  No users found matching &quot;{search}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
