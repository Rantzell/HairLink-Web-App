import prisma from '../config/database';

/**
 * Helper to create a status history entry for polymorphic models.
 * Replaces Eloquent's morphMany StatusHistory relation.
 *
 * @param trackableType The Eloquent class name — kept as-is for DB compatibility
 * @param trackableId   The UUID string ID of the trackable record
 * @param status        Status string
 * @param notes         Optional notes
 * @param metadata      Optional JSON metadata (e.g. preview photos)
 */
export async function createStatusHistory(
  trackableType: 'App\\Models\\Donation' | 'App\\Models\\HairRequest' | 'App\\Models\\WigProduction',
  trackableId: string | number,
  status: string,
  notes?: string | null,
  metadata?: Record<string, any> | null
) {
  return prisma.statusHistory.create({
    data: {
      trackableType,
      trackableId: Number(trackableId),
      status,
      notes: notes || null,
      metadata: metadata || undefined,
    },
  });
}

/**
 * Get status histories for a trackable record.
 */
export async function getStatusHistories(
  trackableType: string,
  trackableId: string | number,
  orderDesc = true
) {
  return prisma.statusHistory.findMany({
    where: { trackableType, trackableId: Number(trackableId) },
    orderBy: { createdAt: orderDesc ? 'desc' : 'asc' },
  });
}
