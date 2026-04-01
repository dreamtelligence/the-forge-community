'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function completeOnboardingTour() {
  const session = await auth();
  if (!session?.user?.email) return { error: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { hasSeenTour: true }
    });
    revalidatePath('/forge');
    return { success: true };
  } catch (error) {
    console.error('Failed to update tour status:', error);
    return { error: 'Database update failed' };
  }
}

export async function completeCockpitTour() {
  const session = await auth();
  if (!session?.user?.email) return { error: 'Unauthorized' };

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { hasSeenCockpitTour: true }
    });
    revalidatePath('/forum');
    return { success: true };
  } catch (error) {
    console.error('Failed to update cockpit tour status:', error);
    return { error: 'Database update failed' };
  }
}
