"use client";

import { useState } from "react";

interface User {
  id: number;
  name: string;
  email: string;
  plan: "FREE" | "PAID";
  role: "SELLER" | "ADMIN";
}

export default function UsersPage() {
  const [users] = useState<User[]>([
    { id: 1, name: "Mock Seller", email: "seller@example.com", plan: "FREE", role: "SELLER" },
    { id: 2, name: "Paid Seller", email: "paid-seller@example.com", plan: "PAID", role: "SELLER" },
    { id: 3, name: "Mock Admin", email: "admin@example.com", plan: "PAID", role: "ADMIN" },
  ]);

  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">User Accounts</h1>

      <div className="mb-6 max-w-sm">
        <input
          type="search"
          data-testid="user-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name or email..."
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
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr
                key={u.id}
                className="border-b border-zinc-200 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
              >
                <td className="p-4 text-sm font-semibold">{u.name}</td>
                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{u.email}</td>
                <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{u.role}</td>
                <td className="p-4 text-sm font-semibold">{u.plan}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-sm text-zinc-500">
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
