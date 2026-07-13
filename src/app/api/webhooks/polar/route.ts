import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Verify the Polar.sh webhook signature.
 * Polar sends a `polar-webhook-signature` header containing the HMAC-SHA256
 * hex digest of the raw request body, keyed with POLAR_WEBHOOK_SECRET.
 */
function verifyPolarSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  // Polar may prefix the header with "sha256="; strip it if present
  const receivedBuf = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');

  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }

  return timingSafeEqual(expectedBuf, receivedBuf);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    // Mock / dev mode: skip signature verification but warn loudly
    console.warn(
      '[polar/webhook] POLAR_WEBHOOK_SECRET is not set — skipping signature verification (mock mode). ' +
        'Do NOT run in this mode in production.',
    );
  } else {
    const signature = request.headers.get('polar-webhook-signature') ?? '';

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const isValid = verifyPolarSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const eventType = payload.type as string | undefined;

  if (eventType === 'subscription.created' || eventType === 'subscription.updated') {
    // Extract user email from the payload.
    // Polar's subscription events typically nest the customer email under
    // payload.data.customer.email or payload.data.subscription.customer_email.
    const data = payload.data as Record<string, unknown> | undefined;
    const subscription = (data?.subscription ?? data) as Record<string, unknown> | undefined;
    const customer = subscription?.customer as Record<string, unknown> | undefined;

    const email =
      (customer?.email as string | undefined) ??
      (subscription?.customer_email as string | undefined) ??
      (data?.customer_email as string | undefined);

    // Extract amount (stored in cents; convert to decimal dollars for the DB)
    const amountRaw =
      (subscription?.amount as number | undefined) ??
      (subscription?.price_amount as number | undefined) ??
      (data?.amount as number | undefined) ??
      0;

    const paidAmount = (amountRaw / 100).toFixed(2);

    if (!email) {
      console.error('[polar/webhook] Could not extract customer email from payload:', JSON.stringify(payload));
      return NextResponse.json({ error: 'Customer email not found in payload' }, { status: 422 });
    }

    // Compute expiry: now + 1 year
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    try {
      await db
        .update(users)
        .set({
          plan: 'PAID',
          paidAmount: paidAmount,
          expiresAt: expiresAt,
        })
        .where(eq(users.email, email));

      console.info(`[polar/webhook] Updated user ${email} to PAID plan, expires ${expiresAt.toISOString()}`);
    } catch (dbError) {
      console.error('[polar/webhook] DB update failed:', dbError);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
  } else {
    // Other event types are acknowledged but not processed
    console.info(`[polar/webhook] Unhandled event type: ${eventType}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
