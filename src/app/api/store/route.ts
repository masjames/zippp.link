import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { storeLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/store
 * Returns the current user's store (or null if none exists).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [store] = await db
      .select()
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    return NextResponse.json(store ?? null);
  } catch (err) {
    console.error('[GET /api/store]', err);
    return NextResponse.json(null);
  }
}

/**
 * POST /api/store
 * Creates or updates the current user's store.
 * Body: { slug, title, description, waNumber, customWaMessage? }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, title, description, waNumber, customWaMessage } = body as {
    slug?: string;
    title?: string;
    description?: string;
    waNumber?: string;
    customWaMessage?: string;
  };

  if (!title || !waNumber) {
    return NextResponse.json({ error: 'title and waNumber are required' }, { status: 400 });
  }

  try {
    // Check if store already exists for this user
    const [existing] = await db
      .select({ id: storeLinks.id })
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    if (existing) {
      // Update existing store
      const updateData: Partial<typeof storeLinks.$inferInsert> = {
        title,
        description: description ?? '',
        waNumber,
        customWaMessage: customWaMessage ?? null,
      };
      // Only update slug if provided and different
      if (slug) {
        updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }

      const [updated] = await db
        .update(storeLinks)
        .set(updateData)
        .where(eq(storeLinks.id, existing.id))
        .returning();

      return NextResponse.json(updated);
    } else {
      // Create new store
      const finalSlug = (slug ?? title)
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);

      const [created] = await db
        .insert(storeLinks)
        .values({
          userId: session.user.id,
          slug: finalSlug,
          title,
          description: description ?? '',
          waNumber,
          customWaMessage: customWaMessage ?? null,
        })
        .returning();

      return NextResponse.json(created, { status: 201 });
    }
  } catch (err: unknown) {
    console.error('[POST /api/store]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.includes('unique')) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Database error', detail: message }, { status: 500 });
  }
}
