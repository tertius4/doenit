/** True when `version` (e.g. "2.0.6") is older than `minimum`, part by part. An unreadable version counts as not older. */
export function isOlderVersion(version: string, minimum: string): boolean {
  const parts = version.split(".").map(Number);
  const minimum_parts = minimum.split(".").map(Number);

  for (const [index, minimum_part] of minimum_parts.entries()) {
    const part = parts[index] ?? 0;
    if (part !== minimum_part) return part < minimum_part;
  }
  return false;
}
