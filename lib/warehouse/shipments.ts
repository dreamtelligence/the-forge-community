import { prisma } from '@/lib/database/prisma';
import { parseShipmentStatusParam } from '@/lib/warehouse/contracts';

export { parseShipmentStatusParam };

export type ShipmentFilters = {
  status?: string | null;
  orderId?: string | null;
};

export async function listShipments(ventureId: string, filters: ShipmentFilters) {
  const status = parseShipmentStatusParam(filters.status ?? null);
  const orderId = filters.orderId?.trim();

  return prisma.shipment.findMany({
    where: {
      ventureId,
      ...(status ? { status } : {}),
      ...(orderId ? { orderId } : {}),
    },
    include: {
      order: {
        select: { id: true, orderNumber: true, status: true, source: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });
}
