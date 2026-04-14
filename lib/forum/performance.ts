import { NextResponse } from 'next/server';

type ForumMetricValue = string | number | boolean | null | undefined;

export type ForumMetricStep = {
  name: string;
  durationMs: number;
};

export type ForumMetricDetails = Record<string, ForumMetricValue>;

export type ForumInitialPageMetrics = {
  route: '/forum';
  serverRenderMs: number;
  authMs: number;
  feedQueryMs: number;
  userQueryMs: number;
  bootstrapBytes: number;
  initialPostCount: number;
  hasInitialUser: boolean;
  hasNextCursor: boolean;
  category: string;
  sort: string;
};

type ForumMetric = {
  route: string;
  durationMs: number;
  payloadBytes?: number;
  status?: number;
  steps?: ForumMetricStep[];
  details?: ForumMetricDetails;
};

function roundMetric(value: number) {
  return Number(value.toFixed(1));
}

function toHeaderKey(key: string) {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function shouldLogForumMetrics() {
  return process.env.NODE_ENV !== 'production' || process.env.FORUM_PERF_LOG === 'true';
}

function toSerializableMetric(metric: ForumMetric) {
  return {
    route: metric.route,
    status: metric.status ?? 200,
    durationMs: roundMetric(metric.durationMs),
    payloadBytes: metric.payloadBytes,
    steps: (metric.steps || []).map((step) => ({
      name: step.name,
      durationMs: roundMetric(step.durationMs),
    })),
    details: metric.details || {},
    timestamp: new Date().toISOString(),
  };
}

export function getJsonPayloadBytes(payload: unknown) {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
}

export function logForumMetric(metric: ForumMetric) {
  if (!shouldLogForumMetrics()) return;

  console.info('[ForumPerf]', JSON.stringify(toSerializableMetric(metric)));
}

export function attachForumMetricHeaders(response: NextResponse, metric: ForumMetric) {
  response.headers.set('X-Forum-Route', metric.route);
  response.headers.set('X-Forum-Status', String(metric.status ?? 200));
  response.headers.set('X-Forum-Duration-Ms', String(roundMetric(metric.durationMs)));

  if (typeof metric.payloadBytes === 'number') {
    response.headers.set('X-Forum-Payload-Bytes', String(metric.payloadBytes));
  }

  for (const [key, value] of Object.entries(metric.details || {})) {
    if (value === null || value === undefined) continue;
    response.headers.set(`X-Forum-${toHeaderKey(key)}`, String(value));
  }

  const serverTiming = [...(metric.steps || []), { name: 'total', durationMs: metric.durationMs }]
    .map((step) => `${step.name};dur=${roundMetric(step.durationMs)}`)
    .join(', ');

  if (serverTiming) {
    response.headers.set('Server-Timing', serverTiming);
  }

  return response;
}

export function createForumJsonResponse<T>(
  payload: T,
  {
    route,
    durationMs,
    payloadBytes = getJsonPayloadBytes(payload),
    status = 200,
    steps = [],
    details = {},
  }: ForumMetric
) {
  const response = NextResponse.json(payload, { status });

  attachForumMetricHeaders(response, {
    route,
    durationMs,
    payloadBytes,
    status,
    steps,
    details,
  });

  logForumMetric({
    route,
    durationMs,
    payloadBytes,
    status,
    steps,
    details,
  });

  return response;
}
