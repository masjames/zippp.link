import crypto from 'crypto';

/**
 * Generates an HMAC SHA256 signature for a webhook payload.
 * 
 * @param payload - The string or object payload of the webhook.
 * @param secret - The webhook secret.
 * @returns The hex-encoded HMAC SHA256 signature.
 */
export function generateWebhookSignature(payload: string | object, secret: string): string {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Helper to retrieve the signature header value.
 * Currently matches the hex-encoded signature directly.
 */
export function getWebhookSignatureHeader(payload: string | object, secret: string): string {
  return generateWebhookSignature(payload, secret);
}
