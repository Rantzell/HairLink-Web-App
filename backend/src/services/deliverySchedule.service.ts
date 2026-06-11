import prisma from '../config/database';
import { notifyDonorDeliveryDue, notifyStaffDeliveryDue } from './notification.service';

/**
 * Finds donations whose donor-scheduled delivery date has arrived (or passed)
 * and haven't been flagged yet, then notifies the donor (to send their
 * tracking link) and staff (that the delivery is due) once each.
 */
export async function checkDueDeliverySchedules() {
  try {
    const candidates = await prisma.donation.findMany({
      where: {
        status: 'Verified',
        scheduledDeliveryAt: { not: null },
        deliveryDueNotified: { not: true },
      },
      include: { user: true },
    });

    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

    const due = candidates.filter((donation) => {
      const scheduledAt = donation.scheduledDeliveryAt;
      if (!scheduledAt) return false;
      const scheduledStr = scheduledAt.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
      return scheduledStr <= todayStr;
    });

    for (const donation of due) {
      if (donation.userId) {
        await notifyDonorDeliveryDue(donation.userId, donation.reference!);
      }
      await notifyStaffDeliveryDue(donation.user?.name || 'A donor', donation.reference!);
      await prisma.donation.update({
        where: { id: donation.id },
        data: { deliveryDueNotified: true },
      });
    }
  } catch (err) {
    console.error('[DeliverySchedule] checkDueDeliverySchedules failed:', err);
  }
}

