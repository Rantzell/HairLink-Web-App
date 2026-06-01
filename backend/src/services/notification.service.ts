import prisma from '../config/database';

export const createNotification = async (userId: string, title: string, message: string, type: string = 'general') => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const notif = await prisma.notifications.create({
      data: {
        user_id: userId,
        title,
        message,
        type,
        is_read: false,
      },
    });
    return notif;
  } catch (err: any) {
    return null;
  }
};

export const notifyDonationStatus = async (userId: string, status: string, reference: string) => {
  const titles: Record<string, string> = {
    'Approved': 'Donation Approved! 🌸',
    'Verified': 'Donation Verified! ✅',
    'Rejected': 'Donation Update',
    'Received Hair': 'Hair Received! ✨',
    'In Queue': 'Production Update',
    'In Progress': 'Wig in Making! 🧵',
    'Completed': 'Wig Completed! 🎉',
    'Wig Received': 'Delivery Confirmed',
    'Submitted': 'Donation Submitted 📝',
  };

  const title = titles[status] || 'Donation Status Updated 🌸';
  const message = `Your donation (${reference}) is now: ${status}. Thank you for your support!`;
  return createNotification(userId, title, message, 'donation');
};

export const notifyRequestStatus = async (userId: string, status: string, reference: string) => {
  const titles: Record<string, string> = {
    'Approved': 'Request Approved! 💖',
    'Verified': 'Request Verified! ✅',
    'Rejected': 'Request Update',
    'Validated': 'Request Validated',
    'In Production': 'Wig in Production 🧵',
    'Matched': 'Wig Matched! ✨',
    'In Transit': 'Wig on its Way! 🚚',
    'Arrived': 'Wig Arrived! 📦',
    'Completed': 'Hope Delivered! 🌸',
    'Submitted': 'Request Submitted 📝',
  };

  const title = titles[status] || 'Request Status Updated 💖';
  const message = `Your wig request (${reference}) is now: ${status}. We are with you on this journey.`;
  return createNotification(userId, title, message, 'request');
};

export const notifyWigmakerAssignment = async (wigmakerId: string, taskCode: string) => {
  return createNotification(
    wigmakerId,
    'New Task Assigned 🧵',
    `You have been assigned a new wig production task: ${taskCode}. Please check your dashboard.`,
    'wigmaker'
  );
};

export const notifyWigmakerMaterialDelivery = async (wigmakerId: string, taskCode: string, trackingLink: string) => {
  return createNotification(
    wigmakerId,
    'Hair Materials Shipped 📦',
    `The staff has sent the materials for task ${taskCode}. Tracking link: ${trackingLink}`,
    'wigmaker'
  );
};

export const notifyCommunityInteraction = async (ownerId: string, actorName: string, postId: string, action: 'comment' | 'like' | 'reply') => {
  const message =
    action === 'comment' ? `${actorName} commented on your post.` :
    action === 'reply'   ? `${actorName} replied to your comment.` :
                           `${actorName} liked your post.`;

  return createNotification(ownerId, 'Community Update 💬', message, 'community');
};

/** Send an announcement notification only to the specified audience.
 *  audience: 'all' | 'donor' | 'recipient' | 'staff'
 */
export const notifyAnnouncement = async (title: string, message: string, audience: string = 'all') => {
  try {
    const roles: string[] =
      audience === 'donor'     ? ['donor'] :
      audience === 'recipient' ? ['recipient'] :
      audience === 'staff'     ? ['staff'] :
      ['donor', 'recipient', 'staff'];

    const targetUsers = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    if (targetUsers.length === 0) return;
    await prisma.notifications.createMany({
      data: targetUsers.map((u) => ({
        user_id: u.id,
        title: `📢 Announcement: ${title}`,
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
        role: { in: ['donor', 'recipient', 'staff'] },
        isActive: true,
      },
      select: { id: true },
    });

    if (targetUsers.length === 0) return;

    const notificationData = targetUsers.map((user) => ({
      user_id: user.id,
      title: `📢 Announcement: ${title}`,
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
    'Donation Received 💖',
    `Thank you! Your monetary contribution of ₱${amount.toLocaleString()} (${reference}) was received and is awaiting verification.`,
    'monetary',
  );
};

export const notifyAllUsers = async (title: string, message: string, type: string = 'announcement') => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ['donor', 'recipient', 'staff'] } },
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
    return users.length;
  } catch (err) {
    console.error('[Notify] notifyAllUsers failed:', err);
    return 0;
  }
};

export const notifyPickupReady = async (userId: string, reference: string) => {
  return createNotification(
    userId,
    '🎉 Your Wig is Ready for Pick-up!',
    `Your custom wig is now ready for collection at our Binondo office. Please visit during office hours to claim your wig. If you have any questions, feel free to contact our staff. Reference: ${reference}`,
    'pickup_ready'
  );
};

export const notifyNewEvent = async (eventTitle: string, eventDate: Date, eventLocation: string | null) => {
  const when = eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  const where = eventLocation ? ` at ${eventLocation}` : '';
  return notifyAllUsers(
    `📣 New Event: ${eventTitle}`,
    `Mark your calendar — ${eventTitle} is happening on ${when}${where}.`,
    'event',
  );
};
