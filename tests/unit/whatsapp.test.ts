import { describe, expect, it } from 'vitest';
import { buildOrderMessage, buildWhatsAppUrl, type WhatsAppOrder } from '@/lib/whatsapp';

const base: WhatsAppOrder = {
  code: 'ALC-7K3M9Q',
  customerName: 'Maria',
  customerPhone: '83999998888',
  fulfillment: 'delivery',
  items: [
    { quantity: 1, productName: 'Pizza', variantName: 'Grande', summary: ['Sabores: 1/2 A, 1/2 B', 'Borda: Catupiry'], notes: 'Sem cebola', lineTotal: 6900 },
    { quantity: 2, productName: 'Refrigerante', variantName: 'Lata', summary: [], notes: null, lineTotal: 1200 },
  ],
  grossSubtotal: 8100,
  discountTotal: 0,
  itemsSubtotal: 8100,
  deliveryFee: null,
  deliveryFeeStatus: 'pending',
  total: 8100,
  paymentMethod: 'cash',
  cashChangeFor: 10000,
  address: { street: 'Rua A', number: '10', neighborhood: 'Centro', complement: 'Casa', reference: 'Perto da praça', city: 'São Bento', state: 'PB' },
  location: { latitude: -6.48, longitude: -37.45 },
  notes: 'Tocar a campainha',
};

describe('whatsapp message', () => {
  it('builds the delivery message with pending fee and total', () => {
    const msg = buildOrderMessage(base);
    expect(msg).toContain('*Pedido: #ALC-7K3M9Q*');
    expect(msg).toContain('Telefone: (83) 99999-8888');
    expect(msg).toContain('*MODALIDADE: ENTREGA*');
    expect(msg).toContain('• 1x Pizza — Grande (R$ 69,00)');
    expect(msg).toContain('   - Obs.: Sem cebola');
    expect(msg).toContain('Taxa de entrega: A confirmar');
    expect(msg).toContain('*Total: A confirmar*');
    expect(msg).toContain('Troco para: R$ 100,00');
    expect(msg).toContain('Endereço: Rua A, 10 (Casa) — Centro, São Bento/PB');
    expect(msg).toContain('Localização: https://www.google.com/maps?q=-6.480000,-37.450000');
    expect(msg).toContain('Aguardo a confirmação da disponibilidade, da taxa de entrega e do pedido.');
  });

  it('omits address and fee for pickup and shows final total', () => {
    const msg = buildOrderMessage({
      ...base,
      fulfillment: 'pickup',
      deliveryFeeStatus: 'not_applicable',
      address: null,
      location: null,
      paymentMethod: 'pix',
      cashChangeFor: null,
    });
    expect(msg).not.toContain('Endereço');
    expect(msg).not.toContain('Taxa de entrega');
    expect(msg).toContain('*Total: R$ 81,00*');
    expect(msg).toContain('Pagamento: Pix');
    expect(msg).not.toContain('Troco');
  });

  it('shows estimated fee as not final and lists discounts', () => {
    const msg = buildOrderMessage({ ...base, deliveryFee: 500, deliveryFeeStatus: 'estimated', total: 8600, discountTotal: 300, grossSubtotal: 8400 });
    expect(msg).toContain('Taxa de entrega: R$ 5,00 (prevista, a confirmar)');
    expect(msg).toContain('*Total estimado: R$ 86,00 (a confirmar)*');
    expect(msg).toContain('Descontos: -R$ 3,00');
  });

  it('dine-in includes table', () => {
    const msg = buildOrderMessage({ ...base, fulfillment: 'dine_in', tableLabel: '5', deliveryFeeStatus: 'not_applicable', address: null });
    expect(msg).toContain('Mesa: 5');
  });

  it('encodes the wa.me URL correctly', () => {
    const url = buildWhatsAppUrl('55 (83) 99921-6691', 'Olá & tchau\n#1');
    expect(url).toBe('https://wa.me/5583999216691?text=Ol%C3%A1%20%26%20tchau%0A%231');
    expect(decodeURIComponent(new URL(url).searchParams.get('text') ?? '')).toBe('Olá & tchau\n#1');
  });
});
