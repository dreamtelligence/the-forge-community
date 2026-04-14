import { prisma } from '@/lib/database/prisma';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export type CreateAiActionInput = {
  userId: string;
  ventureId?: string | null;
  toolName: string;
  payload?: unknown;
  summary?: string | null;
  requiresConfirmation?: boolean;
};

const createConfirmationToken = () => randomUUID();

const toJsonValue = (value: unknown): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput => {
  if (value === undefined || value === null) return Prisma.DbNull;
  return value as Prisma.InputJsonValue;
};

export async function createPendingAction(input: CreateAiActionInput) {
  const confirmationToken = input.requiresConfirmation === false ? null : createConfirmationToken();

  return prisma.aiAction.create({
    data: {
      userId: input.userId,
      ventureId: input.ventureId ?? null,
      toolName: input.toolName,
      payload: toJsonValue(input.payload),
      summary: input.summary ?? null,
      requiresConfirmation: input.requiresConfirmation ?? true,
      confirmationToken,
      status: 'PENDING',
    },
    select: {
      id: true,
      userId: true,
      ventureId: true,
      toolName: true,
      status: true,
      requiresConfirmation: true,
      confirmationToken: true,
      summary: true,
      payload: true,
      createdAt: true,
    },
  });
}

export async function getPendingActionByToken(userId: string, confirmationToken: string) {
  return prisma.aiAction.findFirst({
    where: {
      userId,
      confirmationToken,
      status: 'PENDING',
    },
  });
}

export async function confirmPendingAction(actionId: string) {
  return prisma.aiAction.update({
    where: { id: actionId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });
}

export async function markActionExecuted(actionId: string, result: unknown) {
  return prisma.aiAction.update({
    where: { id: actionId },
    data: {
      status: 'EXECUTED',
      executedAt: new Date(),
      result: toJsonValue(result),
    },
  });
}

export async function markActionFailed(actionId: string, error: string) {
  return prisma.aiAction.update({
    where: { id: actionId },
    data: {
      status: 'FAILED',
      executedAt: new Date(),
      error,
    },
  });
}

export async function cancelPendingAction(actionId: string) {
  return prisma.aiAction.update({
    where: { id: actionId },
    data: {
      status: 'CANCELLED',
      executedAt: new Date(),
    },
  });
}

export async function listPendingActions(userId: string, limit = 5) {
  return prisma.aiAction.findMany({
    where: { userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      toolName: true,
      summary: true,
      confirmationToken: true,
      createdAt: true,
    },
  });
}
