// TEMPORÁRIO (diagnóstico do teste de 320 px; será apagado).
import { test } from '@playwright/test';

for (const path of ['/produto/pizza-calabresa', '/cardapio', '/carrinho', '/']) {
  test(`largura 320 px ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const info = await page.evaluate(() => {
      const wide = [...document.querySelectorAll<HTMLElement>('body *')]
        .map((el) => ({ el, r: el.getBoundingClientRect(), mw: getComputedStyle(el).minWidth, w: getComputedStyle(el).width }))
        .filter(({ r }) => r.right > 321 && r.width > 0)
        .map(({ el, r, mw, w }) => `${el.tagName}.${String(el.className).slice(0, 90)} right=${Math.round(r.right)} w=${Math.round(r.width)} css-w=${w} min-w=${mw} text="${(el.textContent ?? '').trim().slice(0, 40)}"`)
        .slice(0, 15);
      return { innerW: window.innerWidth, vvW: window.visualViewport?.width, docW: document.documentElement.scrollWidth, wide };
    });
    console.log('DIAG2', path, JSON.stringify(info, null, 1));
  });
}
