import { OTLPHttpProtoTraceExporter, registerOTel } from '@vercel/otel';
import type { Context } from '@opentelemetry/api';
import { BatchSpanProcessor, TraceIdRatioBasedSampler, ParentBasedSampler, type ReadableSpan, type Span, type SpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SERVICE_NAME, deploymentEnvironment, traceDestinations, traceSampleRatio } from './config';
import { scrubAttributes, stripQueriesInText } from './scrub';

/** Apaga query strings e campos de contato dos spans antes de qualquer exportação. */
class ScrubSpanProcessor implements SpanProcessor {
  onStart(_span: Span, _context: Context): void {}
  onEnd(span: ReadableSpan): void {
    scrubAttributes(span.attributes as Record<string, never>);
    if (span.name.includes('?')) (span as { name: string }).name = stripQueriesInText(span.name);
  }
  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Liga o OpenTelemetry só quando há pelo menos um destino (Datadog, New Relic ou OTLP).
 * Retorna os nomes dos destinos ligados.
 */
export function registerTracing(env: Record<string, string | undefined> = process.env): string[] {
  const destinations = traceDestinations(env);
  if (destinations.length === 0) return [];

  registerOTel({
    serviceName: env.OTEL_SERVICE_NAME?.trim() || SERVICE_NAME,
    attributes: { 'deployment.environment.name': deploymentEnvironment(env) },
    traceSampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(traceSampleRatio(env)) }),
    spanProcessors: [
      new ScrubSpanProcessor(),
      ...destinations.map((d) => new BatchSpanProcessor(new OTLPHttpProtoTraceExporter({ url: d.url, headers: d.headers }))),
    ],
  });
  return destinations.map((d) => d.name);
}
