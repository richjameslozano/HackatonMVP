// ─── Project ID Serialization ───────────────────────────────────────────────

/**
 * Serializes an array of project IDs into a comma-separated string.
 * Returns an empty string for an empty array.
 */
export function serializeProjectIds(ids: string[]): string {
  return ids.join(',');
}

/**
 * Deserializes a comma-separated string into an array of project IDs.
 * Trims whitespace from each ID and filters out empty strings.
 * Returns an empty array for empty input.
 */
export function deserializeProjectIds(raw: string): string[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }
  return raw.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
}
