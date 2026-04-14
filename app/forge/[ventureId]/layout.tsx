import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import ForgeSidebar from '@/components/ForgeSidebar';
import ForgeMobileNav from '@/components/forge/ForgeMobileNav';
import { AIContextProvider } from '@/app/context/AIContext';
import ContextAwareAiSidebar from '@/components/ContextAwareAiSidebar';
import MobileTabBar from '@/components/MobileTabBar';

export default async function ForgeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ ventureId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.email) {
    return notFound();
  }

  const { ventureId } = await params;

  // Verify access to this venture
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });

  if (!user) {
    return notFound();
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      OR: [
        { ownerId: user.id },
        {
          squad: {
            members: {
              some: {
                userId: user.id,
                leftAt: null
              }
            }
          }
        }
      ]
    },
    include: {
      owner: { select: { name: true, email: true } },
      squad: {
        include: {
          members: {
            where: { leftAt: null },
            include: { user: { select: { name: true, email: true, image: true } } }
          }
        }
      }
    }
  });

  if (!venture) {
    return notFound();
  }

  return (
    <AIContextProvider>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Sidebar */}
        <ForgeSidebar ventureId={ventureId} ventureName={venture.name} />

        {/* Main Content */}
        <div className="ml-0 md:ml-64">
          <ForgeMobileNav ventureId={ventureId} ventureName={venture.name} />
          {/* Content */}
          <main className="px-4 pb-32 pt-6 sm:px-6 md:p-8">
            {children}
          </main>
        </div>

        {/* Global Mobile Navigation */}
        <MobileTabBar />

        {/* AI Sidebar Overlay */}
        <ContextAwareAiSidebar />
      </div>
    </AIContextProvider>
  );
}
