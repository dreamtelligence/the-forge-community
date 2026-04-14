import { auth } from '@/auth';
import { getOrCreatePersonalStudioVentureByEmail } from '@/lib/ventures/index/personal-studio';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StudioPage() {
  const session = await auth();
  const email = session?.user?.email;

  if (!email) {
    redirect('/login');
  }

  const venture = await getOrCreatePersonalStudioVentureByEmail(email);
  redirect(`/forge/${venture.id}/marketing?tab=prompts`);
}
