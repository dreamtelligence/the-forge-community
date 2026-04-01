import { prisma } from './prisma';

export const VENTURE_PHASES = [
  { number: 1, name: 'Ideation', description: 'Business Idee definieren' },
  { number: 2, name: 'Branding', description: 'Brand DNA & Identität' },
  { number: 3, name: 'Legal', description: 'Vertragliche Absicherung' },
  { number: 4, name: 'Sourcing', description: 'Lieferanten & Prototypen' },
  { number: 5, name: 'Marketing', description: 'Content & Reichweite' },
  { number: 6, name: 'Launch', description: 'Ready for Business' },
];

/**
 * Berechnet den Fortschritt eines Ventures und aktualisiert die Phasen automatisch.
 */
export async function updateVentureProgress(ventureId: string) {
  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
    include: {
      brandDNA: true,
      legalDocuments: true,
      suppliers: true,
      samples: true,
      marketingContents: true,
      phases: true,
    },
  });

  if (!venture) return null;

  let currentCalculatedPhase = 1;

  // Phase 2: Branding (Check if Brand DNA exists and has core fields)
  if (venture.brandDNA && venture.brandDNA.brandName && venture.brandDNA.mission) {
    currentCalculatedPhase = 2;
  }

  // Phase 3: Legal (Check if at least one legal document is signed or sent)
  if (venture.legalDocuments.length > 0) {
    currentCalculatedPhase = 3;
  }

  // Phase 4: Sourcing (Check if suppliers exist or samples requested)
  if (venture.suppliers.length > 0 || venture.samples.length > 0) {
    currentCalculatedPhase = 4;
  }

  // Phase 5: Marketing (Check if content exists)
  if (venture.marketingContents.length > 0) {
    currentCalculatedPhase = 5;
  }

  // Upsert all phases to ensure they exist
  for (const phaseDef of VENTURE_PHASES) {
    const status = phaseDef.number < currentCalculatedPhase 
      ? 'COMPLETED' 
      : phaseDef.number === currentCalculatedPhase 
        ? 'IN_PROGRESS' 
        : 'PENDING';

    await prisma.venturePhase.upsert({
      where: {
        ventureId_phaseNumber: {
          ventureId: ventureId,
          phaseNumber: phaseDef.number,
        },
      },
      update: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
      create: {
        ventureId,
        phaseNumber: phaseDef.number,
        name: phaseDef.name,
        status,
      },
    });
  }

  // Update main venture status if changed
  if (venture.currentPhase !== currentCalculatedPhase) {
    await prisma.venture.update({
      where: { id: ventureId },
      data: { 
        currentPhase: currentCalculatedPhase,
        status: currentCalculatedPhase === 6 ? 'LAUNCHED' : 'IN_PROGRESS'
      },
    });
  }

  return currentCalculatedPhase;
}
