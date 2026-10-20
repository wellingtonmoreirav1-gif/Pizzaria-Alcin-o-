/**
 * Gera ilustrações PROVISÓRIAS (SVG) para cada produto do cardápio oficial em
 * public/images/products/<slug>.svg. Não são fotos: cada imagem traz o selo
 * "Imagem ilustrativa" e deve ser substituída pela foto oficial pelo painel.
 *
 * Uso: node scripts/generate-menu-placeholders.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../public/images/products');

const T = {
  calabresa: { color: '#a8432b', shape: 'ring' },
  frango: { color: '#e2b874', shape: 'shred' },
  tomate: { color: '#d8332b', shape: 'slice' },
  presunto: { color: '#e79a9a', shape: 'square' },
  ovo: { color: '#fff4cf', shape: 'egg' },
  cebola: { color: '#d9b4d9', shape: 'ring' },
  pimentao: { color: '#3f9b3a', shape: 'strip' },
  azeitona: { color: '#2b2622', shape: 'olive' },
  bacon: { color: '#9c4a2f', shape: 'strip' },
  catupiry: { color: '#fbf6ea', shape: 'blob' },
  carnedesol: { color: '#7a3e24', shape: 'chunk' },
  coalho: { color: '#f1d79a', shape: 'square' },
  cheddar: { color: '#f29b1d', shape: 'blob' },
  pepperoni: { color: '#b3261e', shape: 'disc' },
  costela: { color: '#6e3420', shape: 'shred' },
  camarao: { color: '#f08a5d', shape: 'shrimp' },
  parmesao: { color: '#f6e7b4', shape: 'dust' },
  provolone: { color: '#f3d36b', shape: 'blob' },
  oregano: { color: '#4f6b2b', shape: 'dust' },
  chocolate: { color: '#4a2516', shape: 'blob' },
  granulado: { color: '#2c140b', shape: 'sprinkle' },
  banana: { color: '#f4d35e', shape: 'disc' },
  canela: { color: '#8b4f24', shape: 'dust' },
  coco: { color: '#ffffff', shape: 'flake' },
  leitecondensado: { color: '#f7efd9', shape: 'drizzle' },
  goiabada: { color: '#a5122a', shape: 'square' },
};

const PIZZAS = {
  'pizza-mucarela': ['oregano'],
  'pizza-calabresa': ['calabresa', 'oregano'],
  'pizza-frango': ['frango', 'oregano'],
  'pizza-marguerita': ['tomate', 'oregano'],
  'pizza-portuguesa': ['presunto', 'ovo', 'cebola', 'pimentao', 'azeitona', 'oregano'],
  'pizza-bacon': ['bacon', 'oregano'],
  'pizza-frango-com-catupiry': ['frango', 'catupiry', 'cebola', 'oregano'],
  'pizza-calabresa-com-catupiry': ['calabresa', 'catupiry', 'cebola', 'oregano'],
  'pizza-carne-de-sol': ['carnedesol', 'cebola', 'oregano'],
  'pizza-carne-de-sol-com-queijo-coalho': ['carnedesol', 'coalho', 'cebola', 'oregano'],
  'pizza-quatro-queijos': ['catupiry', 'parmesao', 'provolone'],
  'pizza-frango-com-cheddar': ['frango', 'cheddar', 'oregano'],
  'pizza-pepperoni': ['pepperoni', 'oregano'],
  'pizza-costela': ['costela', 'cebola'],
  'pizza-camarao-com-catupiry': ['camarao', 'catupiry', 'cebola', 'oregano'],
  'pizza-camarao-aos-quatro-queijos': ['camarao', 'catupiry', 'parmesao', 'provolone'],
  'pizza-chocolate': ['chocolate', 'granulado'],
  'pizza-banana-com-canela': ['banana', 'canela'],
  'pizza-prestigio': ['coco', 'leitecondensado'],
  'pizza-romeu-e-julieta': ['goiabada', 'catupiry'],
};

const NAMES = {
  'pizza-mucarela': 'Pizza Muçarela', 'pizza-calabresa': 'Pizza Calabresa', 'pizza-frango': 'Pizza Frango', 'pizza-marguerita': 'Pizza Marguerita',
  'pizza-portuguesa': 'Pizza Portuguesa', 'pizza-bacon': 'Pizza Bacon', 'pizza-frango-com-catupiry': 'Frango com Catupiry',
  'pizza-calabresa-com-catupiry': 'Calabresa com Catupiry', 'pizza-carne-de-sol': 'Carne de Sol', 'pizza-carne-de-sol-com-queijo-coalho': 'Carne de Sol c/ Coalho',
  'pizza-quatro-queijos': 'Quatro Queijos', 'pizza-frango-com-cheddar': 'Frango com Cheddar', 'pizza-pepperoni': 'Pepperoni', 'pizza-costela': 'Costela',
  'pizza-camarao-com-catupiry': 'Camarão com Catupiry', 'pizza-camarao-aos-quatro-queijos': 'Camarão 4 Queijos', 'pizza-chocolate': 'Chocolate',
  'pizza-banana-com-canela': 'Banana com Canela', 'pizza-prestigio': 'Prestígio', 'pizza-romeu-e-julieta': 'Romeu e Julieta',
  'misto-quente': 'Misto Quente', 'x-burguer': 'X-Burguer', 'x-frango': 'X-Frango', 'x-bacon': 'X-Bacon', 'x-calabresa': 'X-Calabresa',
  'cheddar-bacon': 'Cheddar Bacon', 'duplo-burguer': 'Duplo Burguer', 'alcinao-especial-da-casa': 'Alcinão — Especial', beirute: 'Beirute',
  'batata-frita-400g': 'Batata Frita 400 g', 'batata-frita-cheddar-bacon': 'Batata Cheddar e Bacon', 'isca-de-frango-crocante': 'Isca de Frango',
  'calabresa-do-chef': 'Calabresa do Chef', 'picanha-na-chapa': 'Picanha na Chapa', 'file-mignon-na-chapa': 'Filé Mignon na Chapa',
  'file-a-parmegiana-de-frango': 'Parmegiana de Frango', 'peixe-frito': 'Peixe Frito', 'lasanha-de-carne': 'Lasanha de Carne',
  'lasanha-de-frango': 'Lasanha de Frango', 'lasanha-mista': 'Lasanha Mista',
};

function rng(seed) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function frame(slug, body) {
  const name = NAMES[slug] ?? slug;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" role="img" aria-label="Imagem ilustrativa: ${esc(name)}">
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#2a2422"/><stop offset="1" stop-color="#0c0a09"/></radialGradient>
  <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.6" stop-color="#0c0a09" stop-opacity="0"/><stop offset="1" stop-color="#0c0a09" stop-opacity="0.92"/></linearGradient>
  <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.55"/></filter>
</defs>
<rect width="800" height="600" fill="url(#bg)"/>
<g filter="url(#sh)">${body}</g>
<rect width="800" height="600" fill="url(#fade)"/>
<text x="40" y="540" font-family="Georgia, serif" font-size="40" font-weight="700" fill="#fff">${esc(name)}</text>
<text x="40" y="574" font-family="Arial, sans-serif" font-size="17" letter-spacing="3" fill="#d4af37">IMAGEM ILUSTRATIVA · FOTO OFICIAL EM BREVE</text>
</svg>
`;
}

function topping(kind, x, y, r, rand) {
  const t = T[kind];
  const rot = Math.round(rand() * 360);
  switch (t.shape) {
    case 'ring': return `<circle cx="${x}" cy="${y}" r="${r}" fill="${kind === 'cebola' ? 'none' : t.color}" stroke="${kind === 'cebola' ? t.color : '#7d2d1c'}" stroke-width="${kind === 'cebola' ? 4 : 3}"/>${kind === 'calabresa' ? `<circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#c4613f"/>` : ''}`;
    case 'disc': return `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.color}"/>${kind === 'banana' ? `<circle cx="${x}" cy="${y}" r="${r * 0.3}" fill="#e8bf43"/>` : `<circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 4}" fill="#fff" fill-opacity=".2"/>`}`;
    case 'slice': return `<circle cx="${x}" cy="${y}" r="${r}" fill="${t.color}"/><circle cx="${x}" cy="${y}" r="${r * 0.6}" fill="#ef6a5a"/>`;
    case 'square': return `<rect x="${x - r}" y="${y - r * 0.7}" width="${r * 2}" height="${r * 1.4}" rx="4" fill="${t.color}" transform="rotate(${rot} ${x} ${y})"/>`;
    case 'strip': return `<rect x="${x - r * 1.4}" y="${y - r * 0.35}" width="${r * 2.8}" height="${r * 0.7}" rx="${r * 0.3}" fill="${t.color}" transform="rotate(${rot} ${x} ${y})"/>${kind === 'bacon' ? `<rect x="${x - r * 1.3}" y="${y - r * 0.08}" width="${r * 2.6}" height="${r * 0.16}" fill="#e7b18f" transform="rotate(${rot} ${x} ${y})"/>` : ''}`;
    case 'egg': return `<ellipse cx="${x}" cy="${y}" rx="${r * 1.2}" ry="${r}" fill="#fffaf0"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#f6b519"/>`;
    case 'olive': return `<ellipse cx="${x}" cy="${y}" rx="${r * 0.8}" ry="${r * 0.6}" fill="${t.color}"/><ellipse cx="${x}" cy="${y}" rx="${r * 0.3}" ry="${r * 0.2}" fill="#6b5a4a"/>`;
    case 'blob': return `<path d="M${x - r} ${y} q${r * 0.2} ${-r} ${r} ${-r * 0.9} q${r} ${r * 0.1} ${r} ${r * 0.9} q${-r * 0.1} ${r} ${-r} ${r * 0.9} q${-r} ${-r * 0.1} ${-r} ${-r * 0.9}z" fill="${t.color}"/>`;
    case 'chunk': return `<path d="M${x - r} ${y - r * 0.4} l${r * 1.3} ${-r * 0.6} l${r * 0.7} ${r * 1.1} l${-r * 1.2} ${r * 0.6}z" fill="${t.color}" transform="rotate(${rot} ${x} ${y})"/>`;
    case 'shred': return `<path d="M${x - r} ${y} q${r} ${-r * 0.8} ${r * 2} 0" stroke="${t.color}" stroke-width="${r * 0.55}" stroke-linecap="round" fill="none" transform="rotate(${rot} ${x} ${y})"/>`;
    case 'shrimp': return `<path d="M${x - r} ${y} a${r} ${r} 0 1 1 ${r * 1.6} ${r * 0.6}" stroke="${t.color}" stroke-width="${r * 0.7}" stroke-linecap="round" fill="none" transform="rotate(${rot} ${x} ${y})"/>`;
    case 'dust': return `<circle cx="${x}" cy="${y}" r="${Math.max(2, r * 0.18)}" fill="${t.color}"/>`;
    case 'sprinkle': return `<rect x="${x}" y="${y}" width="${r * 0.9}" height="${r * 0.25}" rx="2" fill="${t.color}" transform="rotate(${rot} ${x} ${y})"/>`;
    case 'flake': return `<path d="M${x} ${y} l${r} ${-r * 0.3} l${-r * 0.4} ${r * 0.5}z" fill="${t.color}"/>`;
    case 'drizzle': return `<path d="M${x - r * 2} ${y} q${r} ${-r} ${r * 2} 0 t${r * 2} 0" stroke="${t.color}" stroke-width="5" stroke-linecap="round" fill="none" transform="rotate(${rot} ${x} ${y})"/>`;
    default: return '';
  }
}

function pizzaSvg(slug, toppings) {
  const rand = rng(slug);
  const cx = 400, cy = 250, R = 205;
  const sweet = toppings.some((t) => ['chocolate', 'banana', 'coco', 'goiabada'].includes(t));
  const base = toppings.includes('chocolate') ? '#5a2e1a' : sweet ? '#f6e3b5' : '#f2c75c';
  let body = `<circle cx="${cx}" cy="${cy + 6}" r="${R + 14}" fill="#1b1512"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="#c98a3c"/><circle cx="${cx}" cy="${cy}" r="${R - 6}" fill="#dea456"/>
<circle cx="${cx}" cy="${cy}" r="${R - 24}" fill="${sweet ? base : '#b8341f'}"/>
<circle cx="${cx}" cy="${cy}" r="${R - 30}" fill="${base}"/>`;
  for (let i = 0; i < 14; i++) {
    const a = rand() * Math.PI * 2, d = rand() * (R - 60);
    body += `<circle cx="${cx + Math.cos(a) * d}" cy="${cy + Math.sin(a) * d}" r="${10 + rand() * 18}" fill="#fff6d6" fill-opacity="${sweet ? 0.12 : 0.35}"/>`;
  }
  for (const kind of toppings) {
    const t = T[kind];
    const count = t.shape === 'dust' ? 60 : t.shape === 'sprinkle' ? 70 : t.shape === 'drizzle' ? 5 : 9 + Math.floor(rand() * 4);
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * (R - 55);
      const size = t.shape === 'dust' || t.shape === 'sprinkle' ? 10 + rand() * 6 : 14 + rand() * 10;
      body += topping(kind, cx + Math.cos(a) * d, cy + Math.sin(a) * d, size, rand);
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    body += `<line x1="${cx}" y1="${cy}" x2="${cx + Math.cos(a) * (R - 8)}" y2="${cy + Math.sin(a) * (R - 8)}" stroke="#8a5a2a" stroke-opacity=".35" stroke-width="2"/>`;
  }
  return body;
}

function burgerSvg(slug, layers) {
  const x = 400; let y = 380; let out = `<ellipse cx="400" cy="398" rx="250" ry="22" fill="#000" fill-opacity=".4"/>`;
  out += `<path d="M190 ${y} h420 a20 20 0 0 1 -20 26 h-380 a20 20 0 0 1 -20 -26z" fill="#c7863f"/>`;
  for (const l of layers) {
    if (l === 'patty' || l === 'chicken') { y -= 40; out += `<rect x="175" y="${y}" width="450" height="40" rx="18" fill="${l === 'patty' ? '#5b2d1c' : '#d9a35a'}"/>`; }
    if (l === 'cheese' || l === 'cheddar') { y -= 6; out += `<path d="M180 ${y} h440 l-30 30 l-30 -18 l-40 26 l-40 -22 l-50 28 l-40 -24 l-50 26 l-40 -22 l-40 24 l-40 -24z" fill="${l === 'cheddar' ? '#f29b1d' : '#f6cf5e'}"/>`; }
    if (l === 'bacon') { y -= 14; out += `<path d="M175 ${y + 10} q55 -18 110 0 t110 0 t110 0 t110 0" stroke="#9c4a2f" stroke-width="16" fill="none" stroke-linecap="round"/>`; }
    if (l === 'ham') { y -= 12; out += `<rect x="185" y="${y}" width="430" height="14" rx="7" fill="#e79a9a"/>`; }
    if (l === 'lettuce') { y -= 12; out += `<path d="M180 ${y + 12} q30 -22 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="#4f9b3a" stroke-width="14" fill="none" stroke-linecap="round"/>`; }
    if (l === 'onion') { y -= 10; out += `<rect x="195" y="${y}" width="410" height="10" rx="5" fill="#b9733a"/>`; }
    if (l === 'egg') { y -= 16; out += `<ellipse cx="${x}" cy="${y + 8}" rx="190" ry="14" fill="#fffaf0"/><circle cx="${x}" cy="${y + 6}" r="18" fill="#f6b519"/>`; }
    if (l === 'mortadela') { y -= 12; out += `<rect x="180" y="${y}" width="440" height="12" rx="6" fill="#f0a9a2"/>`; }
    if (l === 'straw') { y -= 10; for (let i = 0; i < 40; i++) out += `<rect x="${190 + ((i * 53) % 420)}" y="${y + (i % 3) * 3}" width="18" height="3" rx="1" fill="#f1c35a" transform="rotate(${(i * 37) % 60 - 30} ${200 + ((i * 53) % 420)} ${y})"/>`; }
    if (l === 'catupiry') { y -= 30; out += `<ellipse cx="${x + 60}" cy="${y + 15}" rx="70" ry="22" fill="#d9a35a"/><ellipse cx="${x + 60}" cy="${y + 12}" rx="50" ry="12" fill="#fbf6ea"/>`; }
  }
  y -= 120;
  out += `<path d="M190 ${y + 120} q0 -120 210 -120 q210 0 210 120z" fill="#d38b3d"/><path d="M215 ${y + 105} q10 -85 185 -90" stroke="#f0b56b" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  const rand = rng(slug);
  for (let i = 0; i < 22; i++) out += `<ellipse cx="${250 + rand() * 300}" cy="${y + 30 + rand() * 60}" rx="5" ry="3" fill="#fbe7b5"/>`;
  return out;
}

function friesSvg(slug, extra) {
  const rand = rng(slug);
  let out = `<path d="M260 440 l-30 -230 h340 l-30 230z" fill="#b3121f"/><path d="M262 440 l-26 -200" stroke="#fff" stroke-opacity=".08" stroke-width="40"/>`;
  for (let i = 0; i < 26; i++) {
    const x = 250 + rand() * 300, h = 120 + rand() * 90, rot = rand() * 24 - 12;
    out += `<rect x="${x}" y="${230 - h + 60}" width="22" height="${h}" rx="6" fill="#f2c14e" stroke="#d99a2b" stroke-width="2" transform="rotate(${rot} ${x} 230)"/>`;
  }
  out += `<path d="M230 210 h340 l-6 40 h-328z" fill="#8e0d18"/>`;
  if (extra.includes('cheddar')) out += `<path d="M240 200 q60 40 100 0 t110 10 t100 -10 v30 q-160 40 -310 0z" fill="#f29b1d"/>`;
  if (extra.includes('bacon')) for (let i = 0; i < 9; i++) out += `<rect x="${260 + i * 32}" y="${180 + (i % 2) * 12}" width="26" height="10" rx="4" fill="#9c4a2f" transform="rotate(${i * 23} ${270 + i * 32} 185)"/>`;
  out += `<ellipse cx="640" cy="410" rx="60" ry="22" fill="#1d1918"/><ellipse cx="640" cy="404" rx="46" ry="14" fill="#f19c8a"/>`;
  return out;
}

function boardSvg(slug, items) {
  const rand = rng(slug);
  let out = `<rect x="140" y="140" width="520" height="300" rx="40" fill="#6b3e22"/><rect x="160" y="160" width="480" height="260" rx="30" fill="#8a5530"/>`;
  if (items === 'nuggets') for (let i = 0; i < 14; i++) out += `<ellipse cx="${210 + rand() * 360}" cy="${200 + rand() * 180}" rx="${34 + rand() * 10}" ry="${22 + rand() * 6}" fill="#d9952f" stroke="#b9741c" stroke-width="4" transform="rotate(${rand() * 180} 400 300)"/>`;
  if (items === 'calabresa') {
    for (let i = 0; i < 16; i++) { const x = 210 + rand() * 360, y = 200 + rand() * 170; out += `<circle cx="${x}" cy="${y}" r="26" fill="#a8432b" stroke="#7d2d1c" stroke-width="4"/><circle cx="${x}" cy="${y}" r="14" fill="#c4613f"/>`; }
    for (let i = 0; i < 10; i++) out += `<circle cx="${220 + rand() * 340}" cy="${210 + rand() * 160}" r="20" fill="none" stroke="#e6d3e6" stroke-width="5"/>`;
    for (let i = 0; i < 8; i++) out += `<ellipse cx="${220 + rand() * 340}" cy="${210 + rand() * 160}" rx="12" ry="9" fill="#7a8b2b"/>`;
    out += `<path d="M200 330 q200 -60 400 0 v40 q-200 40 -400 0z" fill="#f6e7b4" fill-opacity=".7"/>`;
  }
  out += `<ellipse cx="610" cy="200" rx="50" ry="18" fill="#1d1918"/><ellipse cx="610" cy="195" rx="38" ry="11" fill="#f19c8a"/>`;
  return out;
}

function plateSvg(slug, main) {
  const rand = rng(slug);
  let out = `<ellipse cx="400" cy="290" rx="300" ry="200" fill="#e9e4dd"/><ellipse cx="400" cy="290" rx="250" ry="160" fill="#f7f4ef"/>`;
  if (main === 'parmegiana') {
    out += `<path d="M260 220 q140 -60 280 0 q20 90 -20 130 q-130 40 -240 0 q-40 -50 -20 -130z" fill="#d79a3c"/><path d="M270 230 q130 -50 260 0 q10 70 -15 110 q-120 30 -225 0 q-30 -40 -20 -110z" fill="#c8331f"/>`;
    for (let i = 0; i < 18; i++) out += `<ellipse cx="${300 + rand() * 200}" cy="${240 + rand() * 90}" rx="22" ry="12" fill="#f6e2a0" fill-opacity=".85"/>`;
    for (let i = 0; i < 12; i++) out += `<path d="M${200 + rand() * 60} ${320 + rand() * 60} q60 -30 120 0" stroke="#f1d79a" stroke-width="7" fill="none"/>`;
    return out;
  }
  // arroz, farofa e vinagrete
  for (let i = 0; i < 70; i++) out += `<ellipse cx="${210 + rand() * 120}" cy="${230 + rand() * 120}" rx="7" ry="3" fill="#fffdf6" stroke="#e7e0d2" transform="rotate(${rand() * 180} 260 290)"/>`;
  for (let i = 0; i < 80; i++) out += `<circle cx="${430 + rand() * 120}" cy="${340 + rand() * 50}" r="${2 + rand() * 3}" fill="#d9b072"/>`;
  for (let i = 0; i < 20; i++) out += `<rect x="${450 + rand() * 100}" y="${180 + rand() * 40}" width="12" height="12" rx="2" fill="${['#d8332b', '#3f9b3a', '#f1e3c2'][i % 3]}"/>`;
  if (main === 'picanha' || main === 'file') {
    for (let i = 0; i < 4; i++) out += `<path d="M${330 + i * 40} 230 q30 -20 50 10 l-10 120 q-30 20 -50 -10z" fill="#7a3a24" stroke="#4d2416" stroke-width="3"/><path d="M${336 + i * 40} 245 q20 -12 36 6 l-6 90 q-20 10 -34 -6z" fill="${main === 'picanha' ? '#b0473a' : '#9b3b2f'}"/>${main === 'picanha' ? `<path d="M${330 + i * 40} 230 q30 -20 50 10" stroke="#f6e9d6" stroke-width="8" fill="none"/>` : ''}`;
  }
  if (main === 'peixe') out += `<path d="M300 250 q100 -50 200 0 q20 40 0 80 q-100 40 -200 0 q-20 -40 0 -80z" fill="#d9a04a"/><path d="M320 270 q80 -30 160 0" stroke="#f3cf88" stroke-width="10" fill="none"/><ellipse cx="560" cy="300" rx="24" ry="14" fill="#f4e04d"/>`;
  return out;
}

function lasagnaSvg(slug, kind) {
  const rand = rng(slug);
  let out = `<rect x="160" y="170" width="480" height="270" rx="26" fill="#3a3330"/><rect x="180" y="180" width="440" height="245" rx="18" fill="#c8331f"/>`;
  for (let l = 0; l < 4; l++) out += `<rect x="190" y="${250 + l * 40}" width="420" height="12" rx="6" fill="#f2d48a"/><rect x="190" y="${262 + l * 40}" width="420" height="16" fill="${kind === 'frango' ? '#e2b874' : kind === 'mista' ? (l % 2 ? '#e2b874' : '#7a3e24') : '#7a3e24'}"/>`;
  out += `<path d="M180 200 q220 -40 440 0 v50 q-220 30 -440 0z" fill="#f6c95b"/>`;
  for (let i = 0; i < 26; i++) out += `<circle cx="${200 + rand() * 400}" cy="${205 + rand() * 40}" r="${6 + rand() * 8}" fill="#c98a3c" fill-opacity=".6"/>`;
  for (let i = 0; i < 40; i++) out += `<circle cx="${200 + rand() * 400}" cy="${205 + rand() * 40}" r="2.5" fill="#4f6b2b"/>`;
  return out;
}

function beiruteSvg(slug) {
  let out = `<path d="M110 330 q0 -60 60 -60 h420 q60 0 60 60z" fill="#d38b3d"/>`;
  out += `<rect x="110" y="330" width="540" height="18" fill="#4f9b3a"/><rect x="110" y="348" width="540" height="16" fill="#f6cf5e"/><rect x="110" y="364" width="540" height="18" fill="#f0a9a2"/><rect x="110" y="382" width="540" height="26" rx="10" fill="#5b2d1c"/>`;
  out += `<ellipse cx="300" cy="350" rx="60" ry="12" fill="#fffaf0"/><circle cx="300" cy="348" r="12" fill="#f6b519"/>`;
  out += `<path d="M110 408 h540 q-10 30 -60 30 h-420 q-50 0 -60 -30z" fill="#c7863f"/>`;
  const rand = rng(slug);
  for (let i = 0; i < 18; i++) { const x = 600 + rand() * 120, h = 60 + rand() * 50; out += `<rect x="${x}" y="${420 - h}" width="16" height="${h}" rx="5" fill="#f2c14e" stroke="#d99a2b" stroke-width="2" transform="rotate(${rand() * 30 - 15} ${x} 420)"/>`; }
  return out;
}

const OTHER = {
  'misto-quente': () => burgerSvg('misto-quente', ['ham', 'cheese', 'straw']),
  'x-burguer': () => burgerSvg('x-burguer', ['patty', 'cheese', 'lettuce', 'onion', 'straw']),
  'x-frango': () => burgerSvg('x-frango', ['chicken', 'cheese', 'lettuce', 'straw']),
  'x-bacon': () => burgerSvg('x-bacon', ['patty', 'cheddar', 'bacon', 'lettuce', 'onion', 'straw']),
  'x-calabresa': () => burgerSvg('x-calabresa', ['patty', 'cheese', 'bacon', 'lettuce', 'onion', 'straw']),
  'cheddar-bacon': () => burgerSvg('cheddar-bacon', ['patty', 'cheddar', 'patty', 'bacon', 'lettuce', 'onion']),
  'duplo-burguer': () => burgerSvg('duplo-burguer', ['patty', 'cheese', 'patty', 'cheese', 'ham', 'lettuce', 'onion']),
  'alcinao-especial-da-casa': () => burgerSvg('alcinao-especial-da-casa', ['patty', 'chicken', 'cheese', 'catupiry', 'bacon', 'lettuce', 'onion', 'straw']),
  beirute: () => beiruteSvg('beirute'),
  'batata-frita-400g': () => friesSvg('batata-frita-400g', []),
  'batata-frita-cheddar-bacon': () => friesSvg('batata-frita-cheddar-bacon', ['cheddar', 'bacon']),
  'isca-de-frango-crocante': () => boardSvg('isca-de-frango-crocante', 'nuggets'),
  'calabresa-do-chef': () => boardSvg('calabresa-do-chef', 'calabresa'),
  'picanha-na-chapa': () => plateSvg('picanha-na-chapa', 'picanha'),
  'file-mignon-na-chapa': () => plateSvg('file-mignon-na-chapa', 'file'),
  'file-a-parmegiana-de-frango': () => plateSvg('file-a-parmegiana-de-frango', 'parmegiana'),
  'peixe-frito': () => plateSvg('peixe-frito', 'peixe'),
  'lasanha-de-carne': () => lasagnaSvg('lasanha-de-carne', 'carne'),
  'lasanha-de-frango': () => lasagnaSvg('lasanha-de-frango', 'frango'),
  'lasanha-mista': () => lasagnaSvg('lasanha-mista', 'mista'),
};

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [slug, toppings] of Object.entries(PIZZAS)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), frame(slug, pizzaSvg(slug, toppings)));
  n++;
}
for (const [slug, fn] of Object.entries(OTHER)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), frame(slug, fn()));
  n++;
}
console.log(`${n} ilustrações provisórias geradas em ${OUT}`);
