// Default all browser date formatting to Philippine Standard Time (UTC+8).
//
// HairLink operates out of the Philippines, so dates rendered without an
// explicit `timeZone` option should display in PHT regardless of the user's
// device timezone. We patch the three Date.prototype `toLocale*` formatters
// once at app boot — any call that already passes a `timeZone` option keeps
// its explicit choice.
//
// We do NOT patch the underlying Date storage; only display formatting.

const DEFAULT_TZ = 'Asia/Manila';

type LocalesArg = string | string[] | undefined;
type OptionsArg = Intl.DateTimeFormatOptions | undefined;

function withDefaultTz(options: OptionsArg): Intl.DateTimeFormatOptions {
  if (options && options.timeZone) return options;
  return { ...(options || {}), timeZone: DEFAULT_TZ };
}

const originalToLocaleString = Date.prototype.toLocaleString;
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

Date.prototype.toLocaleString = function (locales?: LocalesArg, options?: OptionsArg) {
  return originalToLocaleString.call(this, locales as never, withDefaultTz(options));
};

Date.prototype.toLocaleDateString = function (locales?: LocalesArg, options?: OptionsArg) {
  return originalToLocaleDateString.call(this, locales as never, withDefaultTz(options));
};

Date.prototype.toLocaleTimeString = function (locales?: LocalesArg, options?: OptionsArg) {
  return originalToLocaleTimeString.call(this, locales as never, withDefaultTz(options));
};

// Also patch Intl.DateTimeFormat so `new Intl.DateTimeFormat(...).format(date)`
// follows the same default.
const OriginalDTF = Intl.DateTimeFormat;
function PatchedDTF(this: unknown, locales?: LocalesArg, options?: OptionsArg) {
  const opts = withDefaultTz(options);
  // Support both `new Intl.DateTimeFormat(...)` and `Intl.DateTimeFormat(...)`.
  if (!(this instanceof PatchedDTF)) {
    return new (OriginalDTF as unknown as new (l?: LocalesArg, o?: OptionsArg) => Intl.DateTimeFormat)(locales, opts);
  }
  return new (OriginalDTF as unknown as new (l?: LocalesArg, o?: OptionsArg) => Intl.DateTimeFormat)(locales, opts);
}
PatchedDTF.prototype = OriginalDTF.prototype;
// Preserve static methods like `supportedLocalesOf`.
Object.setPrototypeOf(PatchedDTF, OriginalDTF);
(Intl as unknown as { DateTimeFormat: typeof Intl.DateTimeFormat }).DateTimeFormat =
  PatchedDTF as unknown as typeof Intl.DateTimeFormat;

export { DEFAULT_TZ };
