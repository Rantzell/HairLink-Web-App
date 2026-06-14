/**
 * Force all date/time formatting in the app to Philippine time (Asia/Manila),
 * regardless of the phone's own timezone.
 *
 * We patch the three `Date` locale formatters so any call that doesn't already
 * specify a `timeZone` gets `Asia/Manila` injected. Explicit `timeZone` options
 * are left untouched. Relative-time math (getTime() diffs) is timezone-agnostic
 * and unaffected.
 *
 * Expo SDK 54 / Hermes ships full ICU, so `Intl.DateTimeFormat` with
 * `timeZone: 'Asia/Manila'` is supported. The Philippines has no DST, so this
 * is stable year-round (UTC+8).
 *
 * Imported for its side-effect from index.js BEFORE the app renders.
 */
const TZ = 'Asia/Manila';
const DEFAULT_LOCALE = 'en-PH';

type Formatter = 'toLocaleString' | 'toLocaleDateString' | 'toLocaleTimeString';

function patch(method: Formatter) {
  const proto = Date.prototype as any;
  const original = proto[method];
  if (!original || original.__manilaPatched) return;

  const patched = function (this: Date, locales?: any, options?: Intl.DateTimeFormatOptions) {
    const opts: Intl.DateTimeFormatOptions = { ...(options || {}) };
    if (!opts.timeZone) opts.timeZone = TZ;
    return original.call(this, locales ?? DEFAULT_LOCALE, opts);
  };
  (patched as any).__manilaPatched = true;
  proto[method] = patched;
}

patch('toLocaleString');
patch('toLocaleDateString');
patch('toLocaleTimeString');

export {};
