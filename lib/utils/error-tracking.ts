type TrackingContext = Record<string, unknown>;

interface SentryCaptureContext {
  tags?: Record<string, string>;
  extra?: TrackingContext;
}

interface SentryLikeModule {
  captureException: (error: unknown, context?: SentryCaptureContext) => void;
}

let sentryModulePromise: Promise<SentryLikeModule | null> | null = null;

function getReleaseTag(): string {
  return (
    process.env.APP_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    'local-dev'
  );
}

function getEnvironmentTag(): string {
  return process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
}

async function loadOptionalSentry(): Promise<SentryLikeModule | null> {
  if (!sentryModulePromise) {
    sentryModulePromise = (async () => {
      try {
        const importer = new Function(
          'specifier',
          'return import(specifier);'
        ) as (specifier: string) => Promise<unknown>;
        const sentryCandidate = (await importer('@sentry/nextjs')) as Partial<SentryLikeModule>;
        if (typeof sentryCandidate.captureException === 'function') {
          return sentryCandidate as SentryLikeModule;
        }
      } catch {
        // Optional dependency not installed; console logs remain the fallback sink.
      }

      return null;
    })();
  }

  return sentryModulePromise;
}

export async function trackServerError(
  error: unknown,
  context: TrackingContext = {}
): Promise<void> {
  const release = getReleaseTag();
  const environment = getEnvironmentTag();

  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : 'UnknownError';

  console.error('[server-error]', {
    name,
    message,
    release,
    environment,
    ...context,
  });

  const sentry = await loadOptionalSentry();
  if (!sentry) return;

  sentry.captureException(error, {
    tags: {
      release,
      environment,
    },
    extra: context,
  });
}
