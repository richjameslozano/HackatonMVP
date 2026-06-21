// ─── Store Helper Utilities ──────────────────────────────────────────────────

/**
 * Determines whether a reward item is purchasable by a member.
 * An item is purchasable if the member has sufficient balance AND the item is in stock.
 * Items with stockQuantity of -1 are treated as unlimited stock (always in stock).
 */
export function isPurchasable(balance: number, cost: number, stockQuantity: number): boolean {
  return balance >= cost && (stockQuantity === -1 || stockQuantity > 0);
}
