// ─── Formatting Utilities ───────────────────────────────────────────────────

/**
 * Truncates a description string to the specified max length.
 * If the text exceeds maxLength, returns the first maxLength characters followed by "...".
 * If the text is within maxLength, returns it unchanged.
 */
export function truncateDescription(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
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
