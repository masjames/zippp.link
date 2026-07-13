import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/checkout/polar?amount=<amount>
 *
 * Redirects the user to the Polar.sh checkout page for the configured product.
 * `amount` is expected in cents (e.g. 999 = $9.99) or as a whole-dollar figure;
 * it is forwarded as-is to the Polar checkout URL as the `price` query parameter.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const amount = searchParams.get('amount') ?? '';

  const productId = process.env.POLAR_PRODUCT_ID ?? 'zippp-pro';
  const checkoutBase = `https://buy.polar.sh/${productId}`;

  const checkoutUrl = amount ? `${checkoutBase}?price=${encodeURIComponent(amount)}` : checkoutBase;

  return NextResponse.redirect(checkoutUrl, 302);
}
