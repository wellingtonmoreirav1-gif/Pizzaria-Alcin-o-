// TEMPORÁRIO (diagnóstico do teste de 320 px; será apagado).
import { test } from '@playwright/test';

test('diagnóstico 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/produto/pizza-calabresa');
  await page.waitForLoadState('networkidle');
  const span = page.getByText('Grande (G)');
  for (let i = 0; i < 3; i++) {
    await span.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const info = await span.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(cx, cy);
      const label = el.closest('label')!.getBoundingClientRect();
      const footer = [...document.querySelectorAll('div')].find((d) => d.className.includes('sticky bottom-0'));
      return {
        scrollY: window.scrollY,
        innerH: window.innerHeight,
        vv: window.visualViewport?.height,
        docH: document.documentElement.scrollHeight,
        span: [r.left, r.top, r.width, r.height].map(Math.round),
        label: [label.left, label.top, label.width, label.height].map(Math.round),
        footer: footer ? [footer.getBoundingClientRect().top, footer.getBoundingClientRect().height].map(Math.round) : null,
        hit: hit ? `${hit.tagName}.${hit.className}`.slice(0, 120) : null,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    console.log('DIAG', i, JSON.stringify(info));
  }
  await page.screenshot({ path: 'test-results/diag-320.png' });
});
