import { ImageResponse } from 'next/og';

export const alt = 'Pizzaria e Churrascaria Alcinão — São Bento (PB)';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagem de compartilhamento (texto; substitua por foto oficial quando disponível). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0c0a09', color: 'white' }}>
        <div style={{ fontSize: 28, letterSpacing: 8, textTransform: 'uppercase', color: '#e5283b' }}>Pizzaria &amp; Churrascaria</div>
        <div style={{ fontSize: 140, fontWeight: 700, fontStyle: 'italic' }}>Alcinão</div>
        <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.75)' }}>Pizzas, almoço e churrasco · São Bento (PB)</div>
        <div style={{ marginTop: 40, display: 'flex', fontSize: 30, background: '#c8102e', padding: '16px 28px', borderRadius: 20, alignSelf: 'flex-start' }}>Peça pelo site e confirme no WhatsApp</div>
      </div>
    ),
    size,
  );
}
