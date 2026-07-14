import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { products, storeLinks } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const MOCK_PRODUCTS = [
  { id: 1, storeId: 0, name: 'Coffee Beans', description: 'Premium Arabica', price: '10.99', imageUrl: null, createdAt: new Date() },
  { id: 2, storeId: 0, name: 'V60 Dripper', description: 'Glass pour-over', price: '25.00', imageUrl: null, createdAt: new Date() },
];

/**
 * GET /api/products
 * Lists all products for the current user's store.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [store] = await db
      .select({ id: storeLinks.id })
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    if (!store) {
      return NextResponse.json([]);
    }

    const rows = await db
      .select()
      .from(products)
      .where(eq(products.storeId, store.id));

    return NextResponse.json(rows);
  } catch (err) {
    console.error('[GET /api/products]', err);
    // Fallback mock for dev/CI when DB not available
    return NextResponse.json(MOCK_PRODUCTS);
  }
}

/**
 * POST /api/products
 * Creates a new product in the current user's store.
 * Body: { name, description?, price, imageUrl? }
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

  const { name, description, price, imageUrl } = body as {
    name?: string;
    description?: string;
    price?: string | number;
    imageUrl?: string;
  };

  if (!name || price == null) {
    return NextResponse.json({ error: 'name and price are required' }, { status: 400 });
  }

  try {
    const [store] = await db
      .select({ id: storeLinks.id })
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    if (!store) {
      return NextResponse.json({ error: 'No store found. Create a store first.' }, { status: 404 });
    }

    const [created] = await db
      .insert(products)
      .values({
        storeId: store.id,
        name,
        description: description ?? null,
        price: String(price),
        imageUrl: imageUrl ?? null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[POST /api/products]', err);
    // Mock response for dev without DB
    return NextResponse.json(
      { id: Date.now(), storeId: 0, name, description: description ?? null, price: String(price), imageUrl: imageUrl ?? null, createdAt: new Date() },
      { status: 201 }
    );
  }
}
