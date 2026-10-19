import { z } from 'zod';
import { normalizeBrazilPhone } from '@/lib/phone';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeBrazilPhone(value);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Informe um telefone válido com DDD.' });
      return z.NEVER;
    }
    return normalized;
  });

export const cartLineSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable(),
  options: z.record(z.uuid(), z.array(z.uuid()).max(20)).default({}),
  quantity: z.number().int().min(1).max(99),
  notes: optionalText(200),
});

export const addressSchema = z.object({
  street: trimmed(120).min(2, 'Informe a rua ou avenida.'),
  number: trimmed(20).min(1, 'Informe o número (ou "s/n").'),
  neighborhood: trimmed(80).min(2, 'Informe o bairro.'),
  complement: optionalText(80),
  reference: optionalText(160),
  city: trimmed(80).min(2, 'Informe a cidade.'),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use a sigla do estado (ex.: PB).'),
  postalCode: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v.replace(/\D/g, '') : null))
    .refine((v) => v === null || /^\d{8}$/.test(v), 'CEP deve ter 8 dígitos.'),
  zoneId: z.uuid().optional().nullable(),
});

export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional().nullable(),
  source: z.enum(['gps', 'map_pin']),
});

export const checkoutSchema = z
  .object({
    idempotencyKey: z.uuid(),
    fulfillment: z.enum(['delivery', 'pickup', 'dine_in']),
    customer: z.object({
      name: trimmed(120).min(2, 'Informe seu nome.'),
      phone: phoneSchema,
    }),
    address: addressSchema.optional().nullable(),
    location: locationSchema.optional().nullable(),
    tableLabel: optionalText(20),
    payment: z.object({
      method: z.enum(['pix', 'cash', 'credit_card', 'debit_card', 'on_delivery']),
      changeForCents: z.number().int().positive().max(1_000_000).optional().nullable(),
    }),
    notes: optionalText(500),
    items: z.array(cartLineSchema).min(1, 'Seu carrinho está vazio.').max(50),
    /** Total de itens que o cliente viu. Usado só para detectar mudança de preço. */
    expectedItemsTotalCents: z.number().int().min(0),
    confirmed: z.literal(true, { message: 'Confirme que os dados estão corretos.' }),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillment === 'delivery' && !data.address) {
      ctx.addIssue({ code: 'custom', path: ['address'], message: 'Informe o endereço de entrega.' });
    }
    if (data.fulfillment !== 'delivery' && data.location) {
      ctx.addIssue({ code: 'custom', path: ['location'], message: 'Localização só é usada para entrega.' });
    }
    if (data.payment.method !== 'cash' && data.payment.changeForCents) {
      ctx.addIssue({ code: 'custom', path: ['payment', 'changeForCents'], message: 'Troco só se aplica a dinheiro.' });
    }
    if (data.payment.method === 'on_delivery' && data.fulfillment !== 'delivery') {
      ctx.addIssue({ code: 'custom', path: ['payment', 'method'], message: 'Pagamento na entrega só vale para entregas.' });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutPayload = z.output<typeof checkoutSchema>;
export type CartLineInput = z.output<typeof cartLineSchema>;

export const quoteSchema = z.object({
  items: z.array(cartLineSchema).max(50),
});

export const reviewSchema = z.object({
  token: z.string().min(10).max(100),
  authorName: trimmed(60).min(1, 'Informe como quer ser identificado.'),
  rating: z.number().int().min(1).max(5),
  comment: optionalText(1000),
});

/** Converte erros do Zod em mensagens simples para a interface. */
export function zodMessages(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((i) => i.message))];
}
