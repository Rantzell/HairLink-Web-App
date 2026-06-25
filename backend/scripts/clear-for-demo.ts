/**
 * clear-for-demo.ts
 * Wipes all transactional / content data while preserving every User record.
 * Safe to run multiple times.
 *
 * Run from the backend directory:
 *   npx ts-node scripts/clear-for-demo.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("🧹  Starting demo cleanup — users will be kept.\n");

  const likes = await prisma.communityPostLike.deleteMany();
  console.log(`  ✓  community_post_likes   deleted: ${likes.count}`);

  // Delete child comments first (self-referencing parentId)
  await prisma.$executeRawUnsafe(
    `DELETE FROM community_comments WHERE parent_id IS NOT NULL`
  );
  const comments = await prisma.communityComment.deleteMany();
  console.log(`  ✓  community_comments     deleted: ${comments.count}`);

  const posts = await prisma.communityPost.deleteMany();
  console.log(`  ✓  community_posts        deleted: ${posts.count}`);

  const notifs = await prisma.notifications.deleteMany();
  console.log(`  ✓  notifications          deleted: ${notifs.count}`);

  const pushTokens = await prisma.user_push_tokens.deleteMany();
  console.log(`  ✓  user_push_tokens       deleted: ${pushTokens.count}`);

  const vouchers = await prisma.voucher.deleteMany();
  console.log(`  ✓  vouchers               deleted: ${vouchers.count}`);

  await prisma.donation.updateMany({
    data: { wigProductionId: null },
  });
  const donations = await prisma.donation.deleteMany();
  console.log(`  ✓  donations              deleted: ${donations.count}`);

  const wigProds = await prisma.wigProduction.deleteMany();
  console.log(`  ✓  wig_productions        deleted: ${wigProds.count}`);

  const hairReqs = await prisma.hairRequest.deleteMany();
  console.log(`  ✓  hair_requests          deleted: ${hairReqs.count}`);

  const monDonations = await prisma.monetaryDonation.deleteMany();
  console.log(`  ✓  monetary_donations     deleted: ${monDonations.count}`);

  const statusHist = await prisma.statusHistory.deleteMany();
  console.log(`  ✓  status_histories       deleted: ${statusHist.count}`);

  const events = await prisma.event.deleteMany();
  console.log(`  ✓  events                 deleted: ${events.count}`);

  const articles = await prisma.haircareArticle.deleteMany();
  console.log(`  ✓  haircare_articles      deleted: ${articles.count}`);

  const videos = await prisma.haircareVideo.deleteMany();
  console.log(`  ✓  haircare_videos        deleted: ${videos.count}`);

  const partnerships = await prisma.partnership.deleteMany();
  console.log(`  ✓  partnerships           deleted: ${partnerships.count}`);

  const legacyTables: Array<{ label: string; fn: () => Promise<{ count: number }> }> = [
    { label: "password_reset_tokens ", fn: () => prisma.password_reset_tokens.deleteMany() },
    { label: "personal_access_tokens", fn: () => prisma.personal_access_tokens.deleteMany() },
    { label: "sessions              ", fn: () => prisma.sessions.deleteMany() },
    { label: "failed_jobs           ", fn: () => prisma.failed_jobs.deleteMany() },
    { label: "job_batches           ", fn: () => prisma.job_batches.deleteMany() },
    { label: "jobs                  ", fn: () => prisma.jobs.deleteMany() },
    { label: "cache                 ", fn: () => prisma.cache.deleteMany() },
    { label: "cache_locks           ", fn: () => prisma.cache_locks.deleteMany() },
  ];

  for (const t of legacyTables) {
    try {
      const r = await t.fn();
      console.log(`  ✓  ${t.label} deleted: ${r.count}`);
    } catch {
      console.log(`  ⚠️  ${t.label} skipped (table not in this DB)`);
    }
  }

  const usersReset = await prisma.user.updateMany({
    data: { milestoneProgress: 0 },
  });
  console.log(
    `\n  ✓  Reset milestoneProgress to 0 for ${usersReset.count} user(s).`
  );

  const userCount = await prisma.user.count();
  console.log(`\n✅  Cleanup complete!`);
  console.log(`   Users preserved: ${userCount}`);
}

main()
  .catch((err) => {
    console.error("\n❌  Cleanup failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
