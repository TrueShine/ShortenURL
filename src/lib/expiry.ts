export type ExpiryPreset = "none" | "1d" | "7d" | "30d" | "custom";

const EXPIRY_PRESETS: readonly ExpiryPreset[] = ["none", "1d", "7d", "30d", "custom"];

export function isExpiryPreset(value: string): value is ExpiryPreset {
  return (EXPIRY_PRESETS as readonly string[]).includes(value);
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
      if (!customDate) return undefined;
      const parsed = new Date(customDate);
      return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
    }
    default:
      return undefined;
  }
}
