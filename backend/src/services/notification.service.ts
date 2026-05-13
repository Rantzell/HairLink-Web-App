import prisma from '../config/database';

export const createNotification = async (userId: string, title: string, message: string, type: string = 'general') => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || (user.role !== 'donor' && user.role !== 'recipient')) return null;

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

export const notifyCommunityInteraction = async (ownerId: string, actorName: string, postId: string, action: 'comment' | 'like') => {
  const message = action === 'comment' 
    ? `${actorName} commented on your post.`
    : `${actorName} liked your post.`;
  
  return createNotification(ownerId, 'Community Update 💬', message, 'community');
};
