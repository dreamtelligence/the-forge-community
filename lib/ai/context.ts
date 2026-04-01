import { prisma } from '@/lib/prisma';

export async function getUserFullContext(userEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    include: {
      memories: {
        orderBy: { createdAt: 'desc' },
        take: 15
      },
      ventures: {
        select: {
          id: true,
          name: true,
          status: true,
          currentPhase: true,
          type: true,
          productType: true,
          brandDNA: {
            select: {
              brandName: true,
              mission: true,
              usp: true
            }
          }
        }
      },
      squadMemberships: {
        include: {
          squad: {
            select: {
              name: true,
              status: true
            }
          }
        }
      },
      _count: {
        select: {
          ventures: true,
          squadMemberships: true,
          forumPosts: true
        }
      }
    }
  });

  if (!user) return null;

  const memoryLines = user.memories.map(m => `- [${m.category}]: ${m.content}`).join('\n');
  const ventureLines = user.ventures.map(v => `- ${v.name} (${v.status}, Phase ${v.currentPhase}): ${v.productType || 'Kein Produkttyp'}`).join('\n');
  const squadLines = user.squadMemberships.map(m => `- ${m.squad.name} (${m.role})`).join('\n');

  return `
USER PROFILE:
Name: ${user.name}
Role: ${user.role}
Karma: ${user.karmaScore}
Credits: ${user.credits}
Founder Number: #${user.founderNumber}

LONG-TERM MEMORY:
${memoryLines || 'Keine gespeicherten Erinnerungen.'}

VENTURES:
${ventureLines || 'Keine aktiven Ventures.'}

SQUADS:
${squadLines || 'Keine Squad-Mitgliedschaften.'}

STATS:
Ventures gesamt: ${user._count.ventures}
Squads gesamt: ${user._count.squadMemberships}
Forum Posts: ${user._count.forumPosts}
`.trim();
}
