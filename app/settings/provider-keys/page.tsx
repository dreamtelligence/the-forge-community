import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { getReplicateKeyStatusForUser } from '@/lib/provider-keys';
import ProviderKeysClient from './ProviderKeysClient';

export const metadata = {
  title: 'Provider Keys | The Forge',
  description: 'Bring your own provider keys for media generation',
};

export default async function ProviderKeysPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/login?callbackUrl=/settings/provider-keys');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    redirect('/login');
  }

  const replicateStatus = await getReplicateKeyStatusForUser(user.id);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-instrument-serif text-white mb-2">Provider Keys</h1>
          <p className="text-white/40">
            Hinterlege deinen eigenen Replicate API Key (BYOK). Der Key wird verschlüsselt gespeichert.
          </p>
        </div>

        <ProviderKeysClient initialReplicateStatus={replicateStatus} />
      </div>
    </div>
  );
}
