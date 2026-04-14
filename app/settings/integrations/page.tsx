/**
 * Integrations Settings Page
 *
 * Manage enterprise integrations: Notion, DocuSign, etc.
 *
 * @author Claude Code
 * @version 1.0.0
 */

import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { redirect } from 'next/navigation';
import IntegrationsClient from './IntegrationsClient';
import { getUserConnections } from '@/lib/integrations/service';
import { INTEGRATION_CONFIGS } from '@/lib/integrations/types';
import { getIntegrationEnvStatus } from '@/lib/integrations/env';

export const metadata = {
  title: 'Integrations | The Forge',
  description: 'Manage your enterprise integrations',
};

export default async function IntegrationsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/settings/integrations');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    redirect('/login');
  }

  // Get user's integrations
  const connections = await getUserConnections(user.id);

  // Format available integrations
  const available = Object.values(INTEGRATION_CONFIGS)
    .filter((config): config is NonNullable<typeof config> => config != null)
    .map(config => {
      const envStatus = getIntegrationEnvStatus(config.provider);
      return ({
      provider: config.provider,
      name: config.name,
      description: config.description,
      icon: config.icon,
      features: config.features,
      configured: envStatus.configured,
      missingEnv: envStatus.missing,
    });
    });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-instrument-serif text-white mb-2">
            Enterprise Integrations
          </h1>
          <p className="text-white/40">
            Verbinde The Forge mit deinem Tech-Stack
          </p>
        </div>

        <IntegrationsClient 
          initialConnections={connections}
          availableIntegrations={available}
        />
      </div>
    </div>
  );
}
