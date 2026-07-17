/**
 * Shared transaction utility functions.
 *
 * Centralizes business logic for categorizing, cleaning, and formatting
 * transaction data so that both server-side aggregation (dashboard page)
 * and client-side filtering (TransactionsList) stay in sync.
 */

// ---------------------------------------------------------------------------
// Category classification
// ---------------------------------------------------------------------------

export type TransactionCategory = 'alacarte' | 'packages' | 'products' | 'other';

/**
 * Determines the sales category of a transaction based on its WessConnect
 * type code and nett amount.
 *
 * Rules:
 *  - 'S' → Ala Carte (any non-zero amount)
 *  - 'C' with negative amount → Ala Carte (point redemption / price adjustment)
 *  - 'G' or 'C' with positive/zero amount → Packages
 *  - 'P' → Products
 */
export function getTransactionCategory(tx: {
  type: string;
  amount: number;
}): TransactionCategory {
  if (tx.type === 'S' || (tx.type === 'C' && tx.amount < 0)) return 'alacarte';
  if (tx.type === 'G' || (tx.type === 'C' && tx.amount >= 0)) return 'packages';
  if (tx.type === 'P') return 'products';
  return 'other';
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/**
 * Cleans a raw WessConnect customer name for display.
 *
 * Customer names in the CSV often follow the format "CODE:Name" —
 * this function strips the prefix code and returns only the human-readable
 * portion. Returns "Walk-in" for empty names.
 */
export function cleanCustomerName(name: string): string {
  if (!name) return 'Walk-in';
  return name.includes(':') ? name.split(':').slice(1).join(':').trim() : name;
}

/**
 * Cleans a raw WessConnect item description for display.
 *
 * 1. If the description is a bare item code (e.g. "HSCS07") and a mapping
 *    exists in the provided dictionary, it resolves the full description.
 * 2. Strips category prefixes like "HSCS08: A La Carte - " leaving only the
 *    service/product name.
 *
 * @param desc         - Raw item description string from the CSV / database.
 * @param dictionary   - Optional ITEM_DICTIONARY lookup (code → full name).
 */
export function cleanItemDescription(
  desc: string,
  dictionary?: Record<string, string>,
): string {
  if (!desc) return '';

  let fullDesc = desc;
  if (dictionary && !desc.includes(':') && dictionary[desc]) {
    fullDesc = dictionary[desc];
  }

  return fullDesc
    .replace(/^[^:]+:\s*(?:A La Carte|Package|Product)?\s*-\s*/i, '')
    .trim();
}
