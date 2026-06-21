// ─── Text Formatting Utilities ──────────────────────────────────────────────

/**
 * Truncates a description string to the specified max length.
 * If the text length is within maxLength, returns it unchanged.
 * If the text exceeds maxLength, returns the first maxLength characters followed by "…" (U+2026).
 */
export function truncateDescription(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '\u2026';
}

/**
 * Formats a non-negative integer coin balance with locale-aware thousands separators.
 * Uses Intl.NumberFormat for proper locale formatting.
 * Never returns an empty string or negative values.
 */
export function formatCoinBalance(balance: number): string {
  const safeBalance = Math.max(0, Math.floor(balance));
  return new Intl.NumberFormat().format(safeBalance);
}
