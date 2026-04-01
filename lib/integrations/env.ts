import type { IntegrationProvider } from '@prisma/client';

type EnvStatus = {
  configured: boolean;
  missing: string[];
};

export function getIntegrationEnvStatus(provider: IntegrationProvider): EnvStatus {
  const required: Record<IntegrationProvider, string[]> = {
    NOTION: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'],
    DOCUSIGN: ['DOCUSIGN_CLIENT_ID', 'DOCUSIGN_CLIENT_SECRET'],
    SLACK: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
    GITHUB: [],
    GOOGLE_CALENDAR: [],
    SHOPIFY: [],
    AIRTABLE: [],
  };

  const keys = required[provider] || [];
  const missing = keys.filter((key) => !process.env[key]);

  return {
    configured: missing.length === 0,
    missing,
  };
}
