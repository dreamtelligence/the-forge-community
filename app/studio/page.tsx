import { auth } from '@/auth';
import {
  findPersonalStudioVentureByEmail,
  getOrCreatePersonalStudioVentureByEmail,
} from '@/lib/ventures/personal-studio';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function createPersonalStudioAction() {
  'use server';

  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect('/login');
  }

  const venture = await getOrCreatePersonalStudioVentureByEmail(email);
  redirect(`/forge/${venture.id}/marketing?tab=prompts`);
}

export default async function StudioPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect('/login');
  }

  const venture = await findPersonalStudioVentureByEmail(email);
  if (venture) {
    redirect(`/forge/${venture.id}/marketing?tab=prompts`);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-20 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">Studio Setup</p>
        <h1 className="text-4xl font-semibold">Personal Studio anlegen</h1>
        <p className="max-w-xl text-base text-white/70">
          Das Studio wird erst erstellt, wenn du den Setup-Flow bewusst startest.
          So entstehen keine versteckten Schreibzugriffe mehr beim bloßen Seitenaufruf.
        </p>
        <form action={createPersonalStudioAction}>
          <button
            type="submit"
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Studio jetzt erstellen
          </button>
        </form>
      </div>
    </main>
  );
}
