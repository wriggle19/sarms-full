/**
 * The legal status transition graph (Section 33 / 65 of the spec). Anything
 * not listed here is rejected by AssetsService.transitionStatus - this is
 * what stops, e.g., a disposed asset from silently becoming "available"
 * again through a stray update.
 *
 * Codes here must match the "code" column seeded into AssetStatus.
 */
export const ASSET_STATUS_TRANSITIONS: Record<string, string[]> = {
  AVAILABLE: ['RESERVED', 'ASSIGNED', 'ON_LOAN', 'MAINTENANCE', 'LOST', 'DAMAGED', 'RETIRED'],
  RESERVED: ['AVAILABLE', 'ASSIGNED', 'ON_LOAN'],
  ASSIGNED: ['AVAILABLE', 'MAINTENANCE', 'LOST', 'DAMAGED', 'STOLEN', 'RETIRED'],
  ON_LOAN: ['AVAILABLE', 'MAINTENANCE', 'LOST', 'DAMAGED', 'STOLEN'],
  MAINTENANCE: ['AVAILABLE', 'RETIRED', 'DAMAGED'],
  LOST: ['AVAILABLE', 'RETIRED'], // recovered, or written off
  STOLEN: ['AVAILABLE', 'RETIRED'],
  DAMAGED: ['MAINTENANCE', 'AVAILABLE', 'RETIRED'],
  RETIRED: ['DISPOSED'],
  DISPOSED: [], // terminal
};

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  return ASSET_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
