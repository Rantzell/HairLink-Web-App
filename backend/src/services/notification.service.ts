import prisma from '../config/database';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export const broadcastPushNotifications = async (userIds: string[], title: string, body: string, data?: any) => {
  try {
    const tokens = await prisma.user_push_tokens.findMany({
      where: { user_id: { in: userIds }, is_active: true }
    });
    
    const messages = [];
    for (const tokenRecord of tokens) {
      if (!Expo.isExpoPushToken(tokenRecord.expo_push_token)) continue;
      messages.push({
        to: tokenRecord.expo_push_token,
        sound: 'default' as const,
        title: title,
        body: body,
        data: data || {},
      });
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('[Notify] Error sending push chunk:', error);
        }
      }
    }
  } catch (err) {
    console.error('[Notify] Error fetching tokens for push:', err);
  }
};

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: string = 'general',
  link: string | null = null,
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const notif = await prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        link,
        is_read: false,
      },
    });

    // Try to send push notification
    await broadcastPushNotifications([userId], title, message, { link });

    return notif;
  } catch (err: any) {
    console.error('Failed to create notification:', err);
    return null;
  }
};

//
// Centralized rules so every call site (donation.routes, staff.routes,
// request.routes, ...) automatically follows them. Both functions return
// `null` when a notification is intentionally suppressed.
//
// Donor rule
//   The donor's certificate is generated at the moment staff sets a donation
//   to "Received Hair" (see donation.routes.ts + staff.routes.ts — both set
//   `certificateNo` in the same write). After that, the donor's involvement
//   is effectively finished — downstream wigmaker statuses are internal
//   production noise and shouldn't reach the donor's inbox. We detect the
//   certificate by reading the donation row, so the rule self-heals even if
//   future statuses are renamed.
//
// Recipient rule
//   The recipient should only see their milestone events: pending → approval
//   → matched → ready/in-transit. Internal statuses ("In Production",
//   "Verified") and the post-confirmation "Completed" (which the recipient
//   triggers themselves via the Confirm Wig Received button) are suppressed
//   to keep the inbox focused. Rejection is always allowed.

const DONOR_POST_CERT_SUPPRESSED = new Set([
  'In Queue',
  'In Progress',
  'Completed',
  'Wig Received',
]);

const RECIPIENT_ALLOWED_STATUSES = new Set([
  // pending
  'Submitted', 'Pending',
  // approval
  'Approved', 'Validated',
  // matched
  'Matched',
  // ready / on its way / arrived for pickup
  'In Transit', 'Arrived', 'Ready', 'Ready for Pickup',
  // critical — always notify rejections
  'Rejected',
]);

export const notifyDonationStatus = async (userId: string, status: string, reference: string) => {
  // Suppress post-certificate updates. We confirm the cert is actually issued
  // before suppressing so an unusual ordering (e.g. status set without a cert)
  // still notifies — fail-open on the user's behalf.
  if (DONOR_POST_CERT_SUPPRESSED.has(status)) {
    try {
      const donation = await prisma.donation.findFirst({
        where: { reference },
        select: { certificateNo: true },
      });
      if (donation?.certificateNo) {
        console.log(`[Notif] Suppressed donor "${status}" for ${reference} — certificate already issued.`);
        return null;
      }
    } catch (err) {
      // DB hiccup → fall through and notify rather than silently drop.
      console.warn('[Notif] Donor cert lookup failed; sending notification anyway:', err);
    }
  }

  const titles: Record<string, string> = {
    'Approved': 'Donation Approved!',
    'Verified': 'Donation Verified!',
    'Rejected': 'Donation Update',
    'Received Hair': 'Hair Received!',
    'In Queue': 'Production Update',
    'In Progress': 'Wig in Making!',
    'Completed': 'Wig Completed!',
    'Wig Received': 'Delivery Confirmed',
    'Submitted': 'Donation Submitted',
  };

  const title = titles[status] || 'Donation Status Updated';
  let message = `Your donation (${reference}) is now: ${status}. Thank you for your support!`;
  if (status === 'Verified') {
    message = `Your donation (${reference}) has been verified. You can now add your delivery tracking link on the tracking page.`;
  }
  return createNotification(userId, title, message, 'donation', `track:donation:${reference}`);
};

export const notifyRequestStatus = async (userId: string, status: string, reference: string) => {
  if (!RECIPIENT_ALLOWED_STATUSES.has(status)) {
    console.log(`[Notif] Suppressed recipient "${status}" for ${reference} — not a milestone event.`);
    return null;
  }

  const titles: Record<string, string> = {
    'Approved': 'Request Approved!',
    'Verified': 'Request Verified!',
    'Rejected': 'Request Update',
    'Validated': 'Request Validated!',
    'In Production': 'Wig in Production',
    'Matched': 'Wig Matched!',
    'In Transit': 'Wig on its Way!',
    'Ready for Pickup': 'Wig Ready for Pickup!',
    'Arrived': 'Wig Arrived!',
    'Completed': 'Hope Delivered!',
    'Submitted': 'Request Submitted',
  };

  const messages: Record<string, string> = {
    'Submitted': `Your wig request (${reference}) has been submitted successfully. Our team will review and validate your request shortly.`,
    'Validated': `Great news! Your wig request (${reference}) has been validated and approved. Please wait while we find and create the perfect wig for you. We will notify you once a matched wig is ready!`,
    'Approved': `Your wig request (${reference}) has been approved! We are now looking for the best wig match for you.`,
    'Verified': `Your wig request (${reference}) has been verified. Sit tight — we're working on finding the right wig for you!`,
    'Matched': `Wonderful news! A wig has been matched to your request (${reference})! Your wig is being prepared for pickup.`,
    'In Production': `Your wig for request (${reference}) is now being crafted by our skilled wigmaker. We'll update you once it's ready!`,
    'In Transit': `Your wig for request (${reference}) is on its way! Check your tracking page for delivery details.`,
    'Ready for Pickup': `Your wig for request (${reference}) is ready for pickup at our Binondo office. Please visit during office hours to collect it.`,
    'Arrived': `Your wig for request (${reference}) has arrived! Please confirm receipt on your tracking page.`,
    'Completed': `Your wig request (${reference}) is now complete. We hope your new wig brings you confidence and joy!`,
    'Rejected': `We're sorry, but your wig request (${reference}) could not be approved at this time. Please check the details or contact our team for more information.`,
  };

  const title = titles[status] || 'Request Status Updated';
  const message = messages[status] || `Your wig request (${reference}) is now: ${status}. We are with you on this journey.`;
  return createNotification(userId, title, message, 'request', `track:request:${reference}`);
};

export const notifyWigmakerAssignment = async (wigmakerId: string, taskCode: string, staffNote?: string) => {
  const noteText = staffNote ? ` Staff note: "${staffNote}"` : '';
  return createNotification(
    wigmakerId,
    'New Task Assigned',
    `You have been assigned a new wig production task: ${taskCode}. Please check your dashboard.${noteText}`,
    'wigmaker'
  );
};

export const notifyWigmakerMaterialDelivery = async (wigmakerId: string, taskCode: string, trackingLink: string) => {
  return createNotification(
    wigmakerId,
    'Hair Batch Shipped',
    `The staff has sent the materials for task ${taskCode}. Tracking link: ${trackingLink}`,
    'wigmaker'
  );
};

export const notifyCommunityInteraction = async (ownerId: string, actorName: string, postId: string, action: 'comment' | 'like' | 'reply') => {
  const actionText =
    action === 'comment' ? `${actorName} commented on your post.` :
      action === 'reply' ? `${actorName} replied to your comment.` :
        `${actorName} liked your post.`;

  // Embed postId in the message (the web client parses this) AND set the link
  // column (the mobile client uses this) so both can deep-link to the post.
  const message = `${actionText} [postId:${postId}]`;

  const title =
    action === 'like' ? 'Someone liked your post' :
      action === 'comment' ? 'New comment on your post' :
        'New reply to your comment';

  return createNotification(ownerId, title, message, 'community', `post:${postId}`);
};

/** Notify both sides of a successful referral redemption. */
export const notifyReferralRedeemed = async (redeemerId: string, referrerId: string, redeemerName: string) => {
  await Promise.all([
    createNotification(
      redeemerId,
      'Referral Applied!',
      `Your referral code was applied successfully — you earned 3 stars. Thank you for spreading the word about HairLink!`,
      'referral',
    ),
    createNotification(
      referrerId,
      'You Earned a Referral Reward!',
      `${redeemerName || 'A new member'} used your referral code — you earned 5 stars. Keep sharing the love!`,
      'referral',
    ),
  ]);
};

/** Send an announcement notification only to the specified audience.
 *  audience: 'all' | 'donor' | 'recipient' | 'staff'
 */
export const notifyAnnouncement = async (title: string, message: string, audience: string = 'all') => {
  try {
    const roles: string[] =
      audience === 'donor' ? ['donor'] :
        audience === 'recipient' ? ['recipient'] :
          audience === 'staff' ? ['staff'] :
            audience === 'donor_recipient' ? ['donor', 'recipient'] :
              ['donor', 'recipient', 'staff', 'wigmaker'];

    const targetUsers = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    if (targetUsers.length === 0) return;
    await prisma.notifications.createMany({
      data: targetUsers.map((u) => ({
        user_id: u.id,
        title: `Announcement: ${title}`,
        message,
        type: 'announcement',
        is_read: false,
      })),
    });
  } catch (err: any) {
    console.error('Error sending targeted announcement notification:', err);
  }
};

export const notifyAllDonorsAndRecipients = async (title: string, message: string) => {
  try {
    const targetUsers = await prisma.user.findMany({
      where: {
        role: { in: ['donor', 'recipient'] },
        isActive: true,
      },
      select: { id: true },
    });

    if (targetUsers.length === 0) return;

    const notificationData = targetUsers.map((user) => ({
      user_id: user.id,
      title: `Announcement: ${title}`,
      message,
      type: 'announcement',
      is_read: false,
    }));

    await prisma.notifications.createMany({
      data: notificationData,
    });
  } catch (err: any) {
    console.error('Error broadcasting announcement notification:', err);
  }
};

export const notifyMonetaryReceived = async (userId: string, amount: number, reference: string) => {
  return createNotification(
    userId,
    'Donation Received',
    `Thank you! Your monetary contribution of ₱${amount.toLocaleString()} (${reference}) has been successfully received and verified.`,
    'monetary',
  );
};

export const notifyAllUsers = async (title: string, message: string, type: string = 'announcement') => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['donor', 'recipient', 'staff', 'wigmaker'] } },
      select: { id: true },
    });
    if (users.length === 0) return 0;

    await prisma.notifications.createMany({
      data: users.map((u) => ({
        user_id: u.id,
        title,
        message,
        type,
        is_read: false,
      })),
    });
    
    // Also broadcast push notifications for this announcement
    await broadcastPushNotifications(users.map(u => u.id), title, message);

    return users.length;
  } catch (err) {
    console.error('[Notify] notifyAllUsers failed:', err);
    return 0;
  }
};

export const notifyPickupReady = async (userId: string, reference: string) => {
  return createNotification(
    userId,
    'Your Wig is Ready for Pick-up!',
    `Your custom wig is now ready for collection at our Binondo office. Please visit during office hours to claim your wig. If you have any questions, feel free to contact our staff. Reference: ${reference}`,
    'pickup_ready'
  );
};

export const notifyNewEvent = async (eventTitle: string, eventDate: Date, eventLocation: string | null) => {
  const when = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  const where = eventLocation ? ` at ${eventLocation}` : '';
  return notifyAllUsers(
    `New Event: ${eventTitle}`,
    `Mark your calendar — ${eventTitle} is happening on ${when}${where}.`,
    'event',
  );
};

export const notifyStaffNewDonation = async (donorName: string, reference: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'New Hair Donation',
        message: `${donorName} has submitted a new hair donation (Ref: ${reference}).`,
        type: 'staff_donation',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffNewDonation failed:', err);
  }
};

export const notifyStaffNewRequest = async (recipientName: string, reference: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'New Wig Request',
        message: `${recipientName} has submitted a new wig request (Ref: ${reference}).`,
        type: 'staff_request',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffNewRequest failed:', err);
  }
};

export const notifyStaffNewMonetary = async (donorName: string, reference: string, amount: number) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'New Monetary Donation',
        message: `${donorName} has submitted a new monetary donation of ₱${amount.toLocaleString()} (Ref: ${reference}).`,
        type: 'staff_monetary',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffNewMonetary failed:', err);
  }
};

export const notifyStaffWigmakerReceivedMaterial = async (taskCode: string, wigmakerName: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Hair Batch Received',
        message: `${wigmakerName} has confirmed receipt of materials for Task #${taskCode}.`,
        type: 'staff_wig_production',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffWigmakerReceivedMaterial failed:', err);
  }
};

export const notifyStaffWigmakerCompletedWig = async (taskCode: string, wigmakerName: string, deliveryLink: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Wig Batch Completed',
        message: `${wigmakerName} has completed Task #${taskCode} and shipped it back. Tracking: ${deliveryLink}`,
        type: 'staff_wig_production',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffWigmakerCompletedWig failed:', err);
  }
};

export const notifyWigmakerStaffReceivedWig = async (wigmakerId: string, taskCode: string) => {
  return createNotification(
    wigmakerId,
    'Wig Received by Staff',
    `The staff has safely received the completed wig for Task #${taskCode}. Great job!`,
    'wigmaker'
  );
};

export const notifyWigmakerStaffReportedMissingWig = async (wigmakerId: string, taskCode: string) => {
  return createNotification(
    wigmakerId,
    'Missing Wig Reported',
    `The staff reported that the wig for Task #${taskCode} is missing from the shipment. Please check your records and contact the staff.`,
    'wigmaker'
  );
};

export const notifyStaffHairReceived = async (taskCode: string, batchRef: string, donationReference: string, wigmakerName: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Hair Received by Wigmaker',
        message: `${wigmakerName} confirmed receipt of hair donation ${donationReference} from batch ${batchRef} (Task #${taskCode}).`,
        type: 'staff_wig_production',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffHairReceived failed:', err);
  }
};

export const notifyStaffDeliveryScheduled = async (donorName: string, reference: string, scheduledAt: Date) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    const when = scheduledAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Hair Delivery Scheduled',
        message: `${donorName} scheduled to send their hair donation (${reference}) on ${when}.`,
        type: 'staff_donation',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffDeliveryScheduled failed:', err);
  }
};

export const notifyDonorDeliveryDue = async (userId: string, reference: string) => {
  return createNotification(
    userId,
    'Time to Send Your Hair Donation!',
    `Today is your scheduled date to send your hair donation (${reference}). Please proceed with the drop-off and submit your delivery tracking link on the tracking page.`,
    'donation'
  );
};

export const notifyStaffDeliveryDue = async (donorName: string, reference: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Hair Delivery Due Today',
        message: `${donorName}'s hair donation (${reference}) is scheduled for delivery today. Watch for their tracking link.`,
        type: 'staff_donation',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffDeliveryDue failed:', err);
  }
};

export const notifyStaffMissingHair = async (taskCode: string, batchRef: string, donationReference: string, wigmakerName: string) => {
  try {
    const staff = await prisma.user.findMany({ where: { role: 'staff', isActive: true }, select: { id: true } });
    if (staff.length === 0) return;
    await prisma.notifications.createMany({
      data: staff.map((s) => ({
        user_id: s.id,
        title: 'Missing Hair Reported',
        message: `${wigmakerName} reported that hair donation ${donationReference} is MISSING from batch ${batchRef} (Task #${taskCode}). Please investigate and re-send the missing hair.`,
        type: 'staff_wig_production',
        is_read: false,
      })),
    });
  } catch (err) {
    console.error('[Notify] notifyStaffMissingHair failed:', err);
  }
};
