export type ExpiryPreset = "none" | "1d" | "7d" | "30d" | "custom";

const EXPIRY_PRESETS: readonly ExpiryPreset[] = ["none", "1d", "7d", "30d", "custom"];

export function isExpiryPreset(value: string): value is ExpiryPreset {
  return (EXPIRY_PRESETS as readonly string[]).includes(value);
}

function isValidCalendarDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as unknown as [never, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

export function presetToIsoDate(preset: ExpiryPreset, customDate: string) {
  const now = Date.now();
  switch (preset) {
    case "1d":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "custom": {
      if (!customDate || !isValidCalendarDate(customDate)) return undefined;
      return new Date(customDate).toISOString();
    }
    default:
      return undefined;
  }
}
