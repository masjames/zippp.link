import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

const MOCK_USERS = [
  { id: 'mock-1', name: 'Mock Seller', email: 'seller@example.com', plan: 'FREE', role: 'SELLER', createdAt: new Date() },
  { id: 'mock-2', name: 'Paid Seller', email: 'paid@example.com', plan: 'PAID', role: 'SELLER', createdAt: new Date() },
  { id: 'mock-3', name: 'Admin User', email: 'admin@zippp.link', plan: 'PAID', role: 'ADMIN', createdAt: new Date() },
];

/**
 * GET /api/admin/users
 * Returns all users. ADMIN role required.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        plan: users.plan,
        paidAmount: users.paidAmount,
        expiresAt: users.expiresAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/admin/users]', err);
    return NextResponse.json(MOCK_USERS);
  }
}
