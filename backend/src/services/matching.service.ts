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
    if (s.includes('10 to 14') || s === 'short') return 1;
    if (s.includes('15 to 20') || s === 'medium') return 2;
    if (s.includes('more than 20') || s === 'long') return 3;
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
