import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users, storeLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/user
 * Returns the current authenticated user's profile including plan, store slug, and stats.
 */
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      // Dev mock: return a synthetic profile for mock credentials
      return NextResponse.json({
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        plan: 'FREE',
        store: null,
      });
    }

    // Fetch store if exists
    const [store] = await db
      .select({
        id: storeLinks.id,
        slug: storeLinks.slug,
        title: storeLinks.title,
        description: storeLinks.description,
        waNumber: storeLinks.waNumber,
        viewsCount: storeLinks.viewsCount,
        waClicksCount: storeLinks.waClicksCount,
      })
      .from(storeLinks)
      .where(eq(storeLinks.userId, user.id))
      .limit(1);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      plan: user.plan,
      expiresAt: user.expiresAt,
      store: store ?? null,
    });
  } catch (err) {
    console.error('[GET /api/user] DB error:', err);
    // Graceful fallback for mock/dev environment
    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      plan: 'FREE',
      store: null,
    });
  }
}
