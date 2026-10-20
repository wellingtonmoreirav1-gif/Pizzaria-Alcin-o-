import { describe, expect, it } from 'vitest';
import { fillBuckets } from '@/lib/admin/reports';

const empty = (bucket: string) => ({ bucket, v: 0 });

describe('fillBuckets', () => {
  it('preenche dias sem pedidos', () => {
    const r = fillBuckets([{ bucket: '2026-10-02', v: 5 }], '2026-10-01', '2026-10-03', 'day', empty);
    expect(r).toEqual([{ bucket: '2026-10-01', v: 0 }, { bucket: '2026-10-02', v: 5 }, { bucket: '2026-10-03', v: 0 }]);
  });
  it('agrupa semanas a partir da segunda-feira e meses no dia 1', () => {
    expect(fillBuckets([], '2026-10-15', '2026-10-27', 'week', empty).map((b) => b.bucket)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26']);
    expect(fillBuckets([], '2026-08-20', '2026-10-01', 'month', empty).map((b) => b.bucket)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
  });
});
