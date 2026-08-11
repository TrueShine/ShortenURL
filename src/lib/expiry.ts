export type ExpiryPreset = "none" | "1d" | "7d" | "30d" | "custom";

export function presetToIsoDate(preset: ExpiryPreset, customDate: string) {
  const now = Date.now();
  switch (preset) {
    case "1d":
      return new Date(now + 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "custom":
      return customDate ? new Date(customDate).toISOString() : undefined;
    default:
      return undefined;
  }
}
