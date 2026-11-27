import { describe, expect, it } from 'vitest';
import { checkoutSchema } from '@/lib/validation/checkout';
import { hashPayload, orderAccessToken, stableStringify, verifyOrderAccessToken } from '@/lib/orders/token';
import { allowedNextStatuses, friendlyDbError } from '@/lib/orders/labels';

const valid = {
  idempotencyKey: '7d3c9b52-4c8e-4a39-9b51-1f0c9a2b3c4d',
  fulfillment: 'delivery',
  customer: { name: ' Maria ', phone: '(83) 99999-8888' },
  address: { street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'São Bento', state: 'pb', postalCode: '58865-000' },
  payment: { method: 'cash', changeForCents: 10000 },
  items: [{ productId: '10000000-0000-4000-8000-000000000002', variantId: null, options: {}, quantity: 1 }],
  expectedItemsTotalCents: 600,
  confirmed: true,
};

describe('checkout schema', () => {
  it('normalizes valid data', () => {
    const r = checkoutSchema.parse(valid);
    expect(r.customer).toEqual({ name: 'Maria', phone: '83999998888' });
    expect(r.address?.state).toBe('PB');
    expect(r.address?.postalCode).toBe('58865000');
  });

  it('requires address for delivery and rejects invalid fields', () => {
    expect(checkoutSchema.safeParse({ ...valid, address: null }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, customer: { name: 'M', phone: '12' } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, confirmed: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, payment: { method: 'pix', changeForCents: 100 } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, fulfillment: 'pickup', address: null, payment: { method: 'on_delivery' } }).success).toBe(false);
  });

  it('accepts pickup without address and validates coordinates', () => {
    expect(checkoutSchema.safeParse({ ...valid, fulfillment: 'pickup', address: null, payment: { method: 'pix' } }).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...valid, location: { latitude: 120, longitude: 0, source: 'gps' } }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, location: { latitude: -6.5, longitude: -37.4, source: 'map_pin' } }).success).toBe(true);
    expect(
      checkoutSchema.safeParse({
        ...valid,
        fulfillment: 'pickup',
        address: null,
        payment: { method: 'pix' },
        location: { latitude: -6.5, longitude: -37.4, source: 'gps' },
      }).success,
    ).toBe(false);
  });
});

describe('order access token', () => {
  const secret = 'x'.repeat(40);
  it('verifies only the matching order', () => {
    const token = orderAccessToken('order-1', secret);
    expect(verifyOrderAccessToken('order-1', token, secret)).toBe(true);
    expect(verifyOrderAccessToken('order-2', token, secret)).toBe(false);
    expect(verifyOrderAccessToken('order-1', `${token.slice(0, -1)}A`, secret)).toBe(false);
    expect(verifyOrderAccessToken('order-1', '', secret)).toBe(false);
  });
  it('hashes payloads independent of key order', () => {
    expect(stableStringify({ b: 1, a: [1, { d: 2, c: 3 }] })).toBe('{"a":[1,{"c":3,"d":2}],"b":1}');
    expect(hashPayload({ a: 1, b: 2 })).toBe(hashPayload({ b: 2, a: 1 }));
  });
});

describe('order status rules', () => {
  it('mirrors database transitions', () => {
    expect(allowedNextStatuses('ready', 'pickup')).toEqual(['completed', 'cancelled']);
    expect(allowedNextStatuses('ready', 'delivery')).toContain('out_for_delivery');
    expect(allowedNextStatuses('completed', 'delivery')).toEqual([]);
    expect(friendlyDbError({ message: 'delivery_fee_not_confirmed' })).toContain('taxa de entrega');
    expect(friendlyDbError({ message: 'weird' })).toContain('Não foi possível');
  });
});
