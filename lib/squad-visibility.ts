import { prisma } from '@/lib/prisma';

export type SquadVisibility = {
  is_public: boolean;
  is_accepting_members: boolean;
};

const VISIBILITY_PREFIX = 'squad_visibility:';

function keyForSquad(squadId: string): string {
  return `${VISIBILITY_PREFIX}${squadId}`;
}

function parseVisibility(raw: string): Partial<SquadVisibility> {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return {
      is_public: typeof parsed.is_public === 'boolean' ? parsed.is_public : undefined,
      is_accepting_members:
        typeof parsed.is_accepting_members === 'boolean'
          ? parsed.is_accepting_members
          : undefined,
    };
  } catch {
    return {};
  }
}

function mergeWithDefaults(
  defaults: SquadVisibility,
  partial: Partial<SquadVisibility>
): SquadVisibility {
  return {
    is_public:
      typeof partial.is_public === 'boolean' ? partial.is_public : defaults.is_public,
    is_accepting_members:
      typeof partial.is_accepting_members === 'boolean'
        ? partial.is_accepting_members
        : defaults.is_accepting_members,
  };
}

export async function getSquadVisibility(
  squadId: string,
  defaults: SquadVisibility
): Promise<SquadVisibility> {
  try {
    const row = await prisma.systemCache.findUnique({
      where: { key: keyForSquad(squadId) },
      select: { value: true },
    });
    if (!row?.value) return defaults;
    return mergeWithDefaults(defaults, parseVisibility(row.value));
  } catch (error) {
    console.error('Failed to read squad visibility:', error);
    return defaults;
  }
}

export async function getSquadVisibilityMap(
  squadIds: string[],
  defaultsBySquad: Record<string, SquadVisibility>
): Promise<Record<string, SquadVisibility>> {
  const result: Record<string, SquadVisibility> = {};

  for (const squadId of squadIds) {
    result[squadId] = defaultsBySquad[squadId] ?? {
      is_public: true,
      is_accepting_members: true,
    };
  }

  if (!squadIds.length) return result;

  try {
    const keys = squadIds.map(keyForSquad);
    const rows = await prisma.systemCache.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    });

    for (const row of rows) {
      const squadId = row.key.startsWith(VISIBILITY_PREFIX)
        ? row.key.slice(VISIBILITY_PREFIX.length)
        : null;
      if (!squadId || !result[squadId]) continue;
      result[squadId] = mergeWithDefaults(result[squadId], parseVisibility(row.value));
    }
  } catch (error) {
    console.error('Failed to read squad visibility map:', error);
  }

  return result;
}

export async function setSquadVisibility(
  squadId: string,
  updates: Partial<SquadVisibility>,
  defaults: SquadVisibility
): Promise<SquadVisibility> {
  const current = await getSquadVisibility(squadId, defaults);
  const next = mergeWithDefaults(current, updates);

  try {
    await prisma.systemCache.upsert({
      where: { key: keyForSquad(squadId) },
      create: {
        key: keyForSquad(squadId),
        value: JSON.stringify(next),
      },
      update: {
        value: JSON.stringify(next),
      },
    });
  } catch (error) {
    console.error('Failed to persist squad visibility:', error);
  }

  return next;
}
