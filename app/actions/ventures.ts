'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/database/prisma';
import { getTemplateByType } from '@/lib/ventures/templates';
import { isForumVenture } from '@/lib/forum/venture';
import { isPersonalStudioVenture } from '@/lib/ventures/personal-studio';
import { revalidatePath } from 'next/cache';

export async function createVenture(data: {
  name: string;
  type: string;
  description?: string;
  typeLabel?: string;
}) {
  console.log('Server Action: createVenture called with', data);
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get template for this venture type
  const template = getTemplateByType(data.type);
  if (!template) {
    throw new Error('Invalid venture type');
  }

  // Create venture
  const venture = await prisma.venture.create({
    data: {
      name: data.name,
      description: data.description,
      type: data.type as any,
      typeLabel: data.typeLabel?.trim() || null,
      ownerId: user.id,
      currentPhase: 1
    }
  });

  // Create steps from template
  await Promise.all(
    template.steps.map((step) =>
      prisma.ventureStep.create({
        data: {
          ventureId: venture.id,
          stepNumber: step.number,
          stepName: step.name,
          status: step.number === 1 ? 'IN_PROGRESS' : 'PENDING',
          data: {
            description: step.description,
            estimatedDays: step.estimatedDays
          }
        }
      })
    )
  );

  // Create tasks from template
  const now = new Date();
  await Promise.all(
    template.tasks.map((task) => {
      const dueDate = new Date(now);
      dueDate.setDate(dueDate.getDate() + task.estimatedDays);

      return prisma.ventureTask.create({
        data: {
          ventureId: venture.id,
          title: task.title,
          description: task.description,
          priority: task.priority as any,
          dueDate,
          isFromTemplate: true,
          assignedToId: user.id
        }
      });
    })
  );

  revalidatePath('/ventures');
  return venture;
}

export async function updateVentureStep(
  ventureId: string,
  stepNumber: number,
  data: any
) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      owner: { email: session.user.email }
    }
  });

  if (!venture) {
    throw new Error('Venture not found');
  }

  // Update step data
  await prisma.ventureStep.update({
    where: {
      ventureId_stepNumber: {
        ventureId,
        stepNumber
      }
    },
    data: {
      data,
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  // Update venture progress
  const nextPhase = stepNumber + 1;

  await prisma.venture.update({
    where: { id: ventureId },
    data: {
      currentPhase: nextPhase <= 6 ? nextPhase : venture.currentPhase,
      lastActivityAt: new Date()
    }
  });

  // Mark next step as in progress
  await prisma.ventureStep.updateMany({
    where: {
      ventureId,
      stepNumber: nextPhase
    },
    data: {
      status: 'IN_PROGRESS'
    }
  });

  revalidatePath('/ventures');
  return { success: true };
}

export async function getVenture(id: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id,
      owner: { email: session.user.email }
    },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' }
      },
      tasks: {
        orderBy: { dueDate: 'asc' }
      },
      costs: true,
      owner: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  return venture;
}

export async function getUserVentures() {
  const session = await auth();
  if (!session?.user?.email) {
    return [];
  }

  const ventures = await prisma.venture.findMany({
    where: {
      owner: { email: session.user.email },
      isPersonalStudio: false,
    },
    include: {
      tasks: {
        where: {
          status: { not: 'DONE' }
        },
        orderBy: { dueDate: 'asc' },
        take: 3
      },
      _count: {
        select: {
          tasks: {
            where: { status: 'DONE' }
          },
          steps: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return ventures.filter(
    (venture) => !isForumVenture(venture) && !isPersonalStudioVenture(venture)
  );
}

export async function deleteVenture(ventureId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      owner: { email: session.user.email }
    },
    select: { id: true, description: true }
  });

  if (!venture) {
    throw new Error('Venture not found');
  }

  if (isPersonalStudioVenture(venture)) {
    throw new Error('Personal Studio kann nicht gelöscht werden');
  }

  await prisma.venture.delete({
    where: { id: ventureId }
  });

  revalidatePath('/ventures');
  return { success: true };
}

export async function updateVentureTask(
  taskId: string,
  data: {
    status?: string;
    title?: string;
    description?: string;
    dueDate?: Date;
  }
) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const task = await prisma.ventureTask.findFirst({
    where: {
      id: taskId,
      venture: {
        owner: { email: session.user.email }
      }
    }
  });

  if (!task) {
    throw new Error('Task not found');
  }

  const updatedTask = await prisma.ventureTask.update({
    where: { id: taskId },
    data: {
      ...data,
      completedAt: data.status === 'DONE' ? new Date() : task.completedAt
    }
  });

  // Update venture last activity
  await prisma.venture.update({
    where: { id: task.ventureId },
    data: { lastActivityAt: new Date() }
  });

  revalidatePath('/ventures');
  return updatedTask;
}

export async function addVentureCost(
  ventureId: string,
  data: {
    category: string;
    name: string;
    amount: number;
    isRecurring: boolean;
    frequency?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const venture = await prisma.venture.findFirst({
    where: {
      id: ventureId,
      owner: { email: session.user.email }
    }
  });

  if (!venture) {
    throw new Error('Venture not found');
  }

  const cost = await prisma.costItem.create({
    data: {
      ...data,
      ventureId
    }
  });

  revalidatePath('/ventures');
  return cost;
}

export async function getVentureCosts(ventureId: string) {
  const session = await auth();
  if (!session?.user?.email) {
    throw new Error('Unauthorized');
  }

  const costs = await prisma.costItem.findMany({
    where: {
      ventureId,
      venture: {
        owner: { email: session.user.email }
      }
    },
    orderBy: { category: 'asc' }
  });

  return costs;
}

// Deadline monitoring and mentor escalation
export async function checkOverdueTasks() {
  const now = new Date();
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  // Find tasks that are 3+ days overdue and haven't been notified
  const overdueTasks = await prisma.ventureTask.findMany({
    where: {
      status: { not: 'DONE' },
      dueDate: { lt: threeDaysAgo },
      overdueNotifiedAt: null
    },
    include: {
      venture: {
        include: {
          owner: true
        }
      }
    }
  });

  // Create mentoring sessions for these ventures
  for (const task of overdueTasks) {
    // Find a mentor (for now, find first user with MENTOR role)
    const mentor = await prisma.user.findFirst({
      where: { role: 'MENTOR' }
    });

    if (mentor) {
      await prisma.mentoringSession.create({
        data: {
          ventureId: task.ventureId,
          mentorId: mentor.id,
          reason: 'DEADLINE_OVERDUE',
          notes: `Task "${task.title}" is ${Math.floor((now.getTime() - task.dueDate!.getTime()) / (1000 * 60 * 60 * 24))} days overdue`
        }
      });

      // Mark task as notified
      await prisma.ventureTask.update({
        where: { id: task.id },
        data: { overdueNotifiedAt: now }
      });
    }
  }

  return overdueTasks.length;
}
