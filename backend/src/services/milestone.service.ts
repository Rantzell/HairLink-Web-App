import crypto from 'crypto';
import prisma from '../config/database';
import { createNotification } from './notification.service';

/**
 * Donor milestone reward system.
 *
 * Each donor earns points toward a "milestone" counter that ticks forward
 * as they contribute (hair received, referrals). Once the counter reaches
 * MILESTONE_THRESHOLD it auto-issues a saveable free-wig voucher and the
 * counter is reset to `progress % threshold` (carrying over the excess so
 * a single large batch never silently swallows points).
 *
 * Call `addMilestonePoints(userId, amount)` from anywhere a donor earns
 * points (e.g. status transitions, successful referral). The service is
 * idempotent per-call (no internal dedup) — callers MUST only invoke it
 * when the underlying event represents a real, one-time award (e.g. only
 * on the actual status transition into "Received Hair", not on every
 * resave of an already-received donation).
 */

const MILESTONE_THRESHOLD = 100;

// Points awarded per source — kept in sync with /donations/stats display.
// REFERRAL          → awarded to the user who *gave* the code.
// REFERRAL_REDEEMED → awarded to the user who *used* someone else's code.
export const POINTS = {
  HAIR_RECEIVED: 10,
  REFERRAL: 5,
  REFERRAL_REDEEMED: 3,
} as const;

// One-year voucher validity. Adjustable later via env if needed.
const VOUCHER_VALID_FOR_DAYS = 365;

function generateVoucherCode(): string {
  // Short, readable, unambiguous codes — uppercase hex, hyphenated.
  // Probability of collision at 10k issued codes ≈ 10^-7, safe.
  const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `HL-VCH-${raw}`;
}

/**
 * Add `amount` points to the user's milestone counter. If one or more
 * MILESTONE_THRESHOLD blocks are crossed, issue that many vouchers and
 * persist the carry-over.
 *
 * Returns `{ vouchersIssued, newProgress }`. Returns `null` if the user
 * is missing or `amount <= 0`.
 */
export async function addMilestonePoints(
  userId: string | null | undefined,
  amount: number,
): Promise<{ vouchersIssued: number; newProgress: number } | null> {
  if (!userId) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, milestoneProgress: true, email: true },
  });
  if (!user) return null;

  const total = (user.milestoneProgress ?? 0) + Math.floor(amount);
  const vouchersToIssue = Math.floor(total / MILESTONE_THRESHOLD);
  const newProgress = total % MILESTONE_THRESHOLD;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { milestoneProgress: newProgress },
    });

    if (vouchersToIssue > 0) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + VOUCHER_VALID_FOR_DAYS);

      for (let i = 0; i < vouchersToIssue; i++) {
        // Retry once on collision — collisions are extremely rare but cheap
        // to handle gracefully.
        let code = generateVoucherCode();
        try {
          await tx.voucher.create({
            data: {
              userId: user.id,
              code,
              type: 'free_wig',
              status: 'active',
              expiresAt,
            },
          });
        } catch {
          code = generateVoucherCode();
          await tx.voucher.create({
            data: {
              userId: user.id,
              code,
              type: 'free_wig',
              status: 'active',
              expiresAt,
            },
          });
        }
      }
    }
  });

  // Notifications outside the transaction — notification failures shouldn't
  // roll back the milestone reset / voucher creation.
  if (vouchersToIssue > 0) {
    try {
      for (let i = 0; i < vouchersToIssue; i++) {
        await createNotification(
          user.id,
          'You\'ve Won a Free Wig!',
          `Congratulations! You reached ${MILESTONE_THRESHOLD} Star Points and earned a free-wig reward. Contact our partner wigmaker to claim your voucher. Check your dashboard for your voucher code.`,
          'reward',
        );
      }
    } catch (err) {
      console.warn(
        '[Milestone] Failed to send voucher notification (non-fatal):',
        err,
      );
    }
    console.log(
      `[Milestone] Issued ${vouchersToIssue} voucher(s) to ${user.email}, progress reset to ${newProgress}.`,
    );
  }

  return { vouchersIssued: vouchersToIssue, newProgress };
}

export const MILESTONE = { THRESHOLD: MILESTONE_THRESHOLD };
