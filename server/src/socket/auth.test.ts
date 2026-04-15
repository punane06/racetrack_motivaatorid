import { describe, it, expect } from 'vitest';
import { buildAccessKeys, validateAccess } from './auth.js';

describe('validateAccess', () => {
  const keys = buildAccessKeys('rec-key', 'safety-key', 'obs-key');

  it('allows valid receptionist key', async () => {
    expect(await validateAccess('receptionist', 'rec-key', keys)).toBe(true);
  });
  it('allows valid safety key', async () => {
    expect(await validateAccess('safety', 'safety-key', keys)).toBe(true);
  });
  it('allows valid observer key', async () => {
    expect(await validateAccess('observer', 'obs-key', keys)).toBe(true);
  });
  it('rejects invalid key for role', async () => {
    expect(await validateAccess('receptionist', 'wrong', keys)).toBe(false);
    expect(await validateAccess('safety', 'rec-key', keys)).toBe(false);
    expect(await validateAccess('observer', 'safety-key', keys)).toBe(false);
  });
});
