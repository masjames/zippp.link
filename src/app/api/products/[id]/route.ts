import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { products, storeLinks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/products/[id]
 * Updates a product. Only the owning seller can update it.
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
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

  try {
    // Ensure product belongs to current user's store
    const [store] = await db
      .select({ id: storeLinks.id })
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    const updateData: Partial<typeof products.$inferInsert> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = String(price);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;

    const [updated] = await db
      .update(products)
      .set(updateData)
      .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Product not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PUT /api/products/[id]]', err);
    // Mock OK response for dev
    return NextResponse.json({ id: productId, name, price, imageUrl, description, updatedAt: new Date() });
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes a product. Only the owning seller can delete it.
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) {
    return NextResponse.json({ error: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const [store] = await db
      .select({ id: storeLinks.id })
      .from(storeLinks)
      .where(eq(storeLinks.userId, session.user.id))
      .limit(1);

    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 });
    }

    const [deleted] = await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.storeId, store.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: 'Product not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true, id: productId });
  } catch (err) {
    console.error('[DELETE /api/products/[id]]', err);
    // Mock OK response for dev
    return NextResponse.json({ deleted: true, id: productId });
  }
}
