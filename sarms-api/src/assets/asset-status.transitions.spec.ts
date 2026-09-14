import { isTransitionAllowed, ASSET_STATUS_TRANSITIONS } from './asset-status.transitions';

describe('asset status lifecycle (§7)', () => {
  it('allows AVAILABLE -> ASSIGNED (issuance)', () => {
    expect(isTransitionAllowed('AVAILABLE', 'ASSIGNED')).toBe(true);
  });

  it('allows ASSIGNED -> MAINTENANCE and MAINTENANCE -> AVAILABLE (repair cycle)', () => {
    expect(isTransitionAllowed('ASSIGNED', 'MAINTENANCE')).toBe(true);
    expect(isTransitionAllowed('MAINTENANCE', 'AVAILABLE')).toBe(true);
  });

  it('allows the retirement path AVAILABLE/ASSIGNED -> RETIRED -> DISPOSED', () => {
    expect(isTransitionAllowed('ASSIGNED', 'RETIRED')).toBe(true);
    expect(isTransitionAllowed('RETIRED', 'DISPOSED')).toBe(true);
  });

  it('never allows a disposed asset to leave DISPOSED (terminal state)', () => {
    for (const to of Object.keys(ASSET_STATUS_TRANSITIONS)) {
      if (to !== 'DISPOSED') {
        expect(isTransitionAllowed('DISPOSED', to)).toBe(false);
      }
    }
    expect(isTransitionAllowed('DISPOSED', 'DISPOSED')).toBe(true);
  });

  it('rejects direct AVAILABLE -> DISPOSED jumps (approval path required)', () => {
    expect(isTransitionAllowed('AVAILABLE', 'DISPOSED')).toBe(false);
  });

  it('rejects issuing an asset in blocking statuses', () => {
    for (const blocked of ['MAINTENANCE', 'RETIRED', 'DISPOSED', 'LOST', 'STOLEN']) {
      expect(isTransitionAllowed(blocked, 'ASSIGNED')).toBe(false);
      expect(isTransitionAllowed(blocked, 'ON_LOAN')).toBe(false);
    }
  });

  it('rejects transitions from unknown statuses', () => {
    expect(isTransitionAllowed('SOMETHING_ELSE', 'AVAILABLE')).toBe(false);
  });
});