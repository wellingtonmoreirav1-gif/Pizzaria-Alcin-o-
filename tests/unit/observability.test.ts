import { describe, expect, it } from 'vitest';
import { parseHeaders, traceDestinations, traceSampleRatio, deploymentEnvironment } from '@/lib/observability/config';
import { scrubAttributes, scrubBreadcrumb, scrubSentryEvent, stripQuery, stripQueriesInText } from '@/lib/observability/scrub';

describe('destinos dos traces', () => {
  it('fica desligado sem variáveis', () => {
    expect(traceDestinations({})).toEqual([]);
    expect(traceDestinations({ DD_API_KEY: '  ' })).toEqual([]);
  });

  it('Datadog usa o endpoint OTLP da Vercel no site informado', () => {
    expect(traceDestinations({ DD_API_KEY: 'k', DD_SITE: 'us5.datadoghq.com' })).toEqual([
      { name: 'datadog', url: 'https://vercel.integrations.otlp.us5.datadoghq.com/v1/traces', headers: { 'dd-api-key': 'k' } },
    ]);
    expect(traceDestinations({ DD_API_KEY: 'k' })[0]?.url).toBe('https://vercel.integrations.otlp.datadoghq.com/v1/traces');
  });

  it('New Relic usa otlp.nr-data.net ou o endpoint informado', () => {
    expect(traceDestinations({ NEW_RELIC_LICENSE_KEY: 'nr' })).toEqual([
      { name: 'newrelic', url: 'https://otlp.nr-data.net/v1/traces', headers: { 'api-key': 'nr' } },
    ]);
    expect(traceDestinations({ NEW_RELIC_LICENSE_KEY: 'nr', NEW_RELIC_OTLP_ENDPOINT: 'https://otlp.eu01.nr-data.net/' })[0]?.url).toBe(
      'https://otlp.eu01.nr-data.net/v1/traces',
    );
  });

  it('OTLP genérico lê endpoint e headers padrão do OpenTelemetry', () => {
    expect(traceDestinations({ OTEL_EXPORTER_OTLP_ENDPOINT: 'https://coletor.exemplo', OTEL_EXPORTER_OTLP_HEADERS: 'x-token=a%20b,y=2' })).toEqual([
      { name: 'otlp', url: 'https://coletor.exemplo/v1/traces', headers: { 'x-token': 'a b', y: '2' } },
    ]);
  });

  it('liga vários destinos ao mesmo tempo', () => {
    const names = traceDestinations({ DD_API_KEY: 'a', NEW_RELIC_LICENSE_KEY: 'b', OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://x/v1/traces' }).map(
      (d) => d.name,
    );
    expect(names).toEqual(['datadog', 'newrelic', 'otlp']);
  });

  it('headers malformados não quebram', () => {
    expect(parseHeaders('=x,semvalor,a=%E0%A4%A')).toEqual({ a: '%E0%A4%A' });
  });

  it('amostragem limitada entre 0 e 1', () => {
    expect(traceSampleRatio({})).toBe(1);
    expect(traceSampleRatio({ OTEL_TRACES_SAMPLE_RATIO: '0.25' })).toBe(0.25);
    expect(traceSampleRatio({ OTEL_TRACES_SAMPLE_RATIO: '7' })).toBe(1);
    expect(traceSampleRatio({ OTEL_TRACES_SAMPLE_RATIO: 'abc' })).toBe(1);
  });

  it('ambiente da Vercel tem prioridade', () => {
    expect(deploymentEnvironment({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe('preview');
  });
});

describe('limpeza de dados sensíveis', () => {
  it('remove a query string (token do pedido)', () => {
    expect(stripQuery('https://site/pedido/ALC-1?t=segredo#topo')).toBe('https://site/pedido/ALC-1?[removido]#topo');
    expect(stripQuery('/cardapio')).toBe('/cardapio');
    expect(stripQueriesInText('fetch GET https://x.supabase.co/rest/v1/orders?phone=eq.5583999')).toBe(
      'fetch GET https://x.supabase.co/rest/v1/orders?[removido]',
    );
  });

  it('limpa atributos de spans', () => {
    const attrs = scrubAttributes({
      'http.url': 'https://site/pedido/ALC-1?t=abc',
      'http.route': '/pedido/[code]',
      'customer.phone': '83999',
      'service.name': 'alcinao',
      'http.status_code': 200,
    });
    expect(attrs).toEqual({
      'http.url': 'https://site/pedido/ALC-1?[removido]',
      'http.route': '/pedido/[code]',
      'customer.phone': '[removido]',
      'service.name': 'alcinao',
      'http.status_code': 200,
    });
  });

  it('limpa eventos e rastros do Sentry', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://site/pedido/X?t=1',
        query_string: 't=1',
        cookies: { a: 'b' },
        data: { phone: '1' },
        headers: { Cookie: 'sb=1', Referer: 'https://site/auth/callback?code=9', Accept: '*/*' },
      },
      user: { ip_address: '1.2.3.4' },
      breadcrumbs: [{ message: 'navegou para /pedido/X?t=1', data: { to: '/pedido/X?t=1', email: 'a@b' } }],
    });
    expect(event).toEqual({
      request: { url: 'https://site/pedido/X?[removido]', headers: { Cookie: '[removido]', Referer: 'https://site/auth/callback?[removido]', Accept: '*/*' } },
      breadcrumbs: [{ message: 'navegou para /pedido/X?[removido]', data: { to: '/pedido/X?[removido]', email: '[removido]' } }],
    });
    expect(scrubBreadcrumb({ data: { url: '/a?b=c' } })).toEqual({ data: { url: '/a?[removido]' } });
  });
});
