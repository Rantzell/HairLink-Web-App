/**
 * Wig-to-request matching algorithm.
 * Ported 1:1 from StaffController::calculateCompatibility() in Laravel.
 */
export function calculateCompatibility(
  request: { wigLength?: string | null; wigColor?: string | null },
  wig: { targetLength?: string | null; targetColor?: string | null }
): number {
  let score = 0;

  // Normalize sizes
  const normalizeSize = (val: string | null | undefined): number => {
    if (!val) return 0;
    const s = val.toLowerCase().trim();
    if (s.includes('10 to 14') || s === 'short' || s.includes('10 inches') || s.includes('12 inches')) return 1;
    // Medium category removed — map mid/15-inch+ sizes to Long
    if (s.includes('more than 15') || s === 'long' || s.includes('15 inches') || s.includes('16 inches') || s.includes('18 inches') || s.includes('20 inches') || parseInt(s) >= 15) return 2;
    return 0;
  };

  const reqSize = normalizeSize(request.wigLength);
  const wigSize = normalizeSize(wig.targetLength);

  if (reqSize > 0 && wigSize > 0) {
    if (reqSize === wigSize) {
      score += 40;
    } else if (Math.abs(reqSize - wigSize) === 1) {
      score += 20;
    }
  }

  // Color Match
  const reqColor = (request.wigColor || '').toLowerCase().trim();
  const wigColor = (wig.targetColor || '').toLowerCase().trim();

  if (reqColor === wigColor) {
    score += 40;
  } else {
    const similar: [string, string][] = [
      ['black', 'brown'],
      ['brown', 'red'],
      ['blonde', 'gray'],
      ['gray', 'white'],
    ];
    for (const [a, b] of similar) {
      if ((reqColor.includes(a) && wigColor.includes(b)) ||
        (reqColor.includes(b) && wigColor.includes(a))) {
        score += 20;
        break;
      }
    }
  }

  // Availability bonus (always 20 if in stock)
  score += 20;

  return score;
}
