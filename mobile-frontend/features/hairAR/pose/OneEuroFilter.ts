/**
 * 1€ (One Euro) filter — adaptive low-pass smoothing for noisy real-time signals.
 *
 * It smooths hard when the value is nearly still (kills jitter) and lightens up
 * when the value moves fast (kills lag). This is what makes TikTok-style filters
 * feel "locked" to the head instead of swimming.
 *
 * Reference: Casiez, Roussel, Vogel — "1€ Filter" (CHI 2012).
 *
 * Use one instance per scalar you track (x, y, scale, roll, pitch, yaw).
 */
export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  /**
   * @param minCutoff Baseline cutoff (Hz). Lower = smoother but laggier at rest.
   * @param beta      Speed coefficient. Higher = less lag on fast motion.
   * @param dCutoff   Cutoff for the derivative. Usually left at 1.0.
   */
  constructor(
    private minCutoff = 1.2,
    private beta = 0.015,
    private dCutoff = 1.0,
  ) {}

  private alpha(cutoff: number, dt: number): number {
    const tau = 1 / (2 * Math.PI * cutoff);
    return 1 / (1 + tau / dt);
  }

  /** @param t timestamp in seconds (e.g. performance.now()/1000) */
  filter(x: number, t: number): number {
    if (this.tPrev == null || this.xPrev == null) {
      this.tPrev = t;
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dt = Math.max(1e-3, t - this.tPrev);

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const edx = this.dxPrev + aD * (dx - this.dxPrev);

    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const a = this.alpha(cutoff, dt);
    const xHat = this.xPrev + a * (x - this.xPrev);

    this.xPrev = xHat;
    this.dxPrev = edx;
    this.tPrev = t;
    return xHat;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/** Smooths an angle (radians) correctly across the ±π wrap-around. */
export class OneEuroAngle {
  private sin = new OneEuroFilter(1.2, 0.015);
  private cos = new OneEuroFilter(1.2, 0.015);
  filter(theta: number, t: number): number {
    const s = this.sin.filter(Math.sin(theta), t);
    const c = this.cos.filter(Math.cos(theta), t);
    return Math.atan2(s, c);
  }
  reset() { this.sin.reset(); this.cos.reset(); }
}
