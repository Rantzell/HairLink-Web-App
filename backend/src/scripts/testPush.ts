import * as dotenv from 'dotenv';
import path from 'path';
// Backend loads the root .env (two levels up from backend/src).
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { PrismaClient } from '@prisma/client';
import { fcmMessaging } from '../config/firebase';

const prisma = new PrismaClient();

async function main() {
  const messaging = fcmMessaging();
  if (!messaging) {
    console.error('[test] FCM not configured — no service account found.');
    process.exit(1);
  }

  const tokens = await prisma.user_push_tokens.findMany({
    where: { is_active: true },
    orderBy: { updated_at: 'desc' },
  });
  console.log(`[test] active tokens: ${tokens.length}`);
  tokens.forEach((t) =>
    console.log(`  - user=${t.user_id} platform=${t.platform} token=${t.expo_push_token.slice(0, 18)}…`),
  );
  if (tokens.length === 0) {
    console.error('[test] No active push tokens — open the app and log in first.');
    process.exit(1);
  }

  const res = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.expo_push_token),
    notification: {
      title: 'HairLink test 🔔',
      body: 'Push is working — sent from the backend test script.',
    },
    data: { type: 'test', link: '/notifications' },
    android: { priority: 'high' },
  });

  console.log(`[test] FCM sent=${res.successCount} failed=${res.failureCount}`);
  res.responses.forEach((r, i) => {
    if (!r.success) console.log(`  ✗ token ${i}: ${r.error?.message}`);
  });
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('[test] error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
