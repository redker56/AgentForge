import { describe, expect, it } from 'vitest';
import { shouldShowWelcome } from '../../src/app/startup.js';

describe('startup helpers', () => {
  it('shows the welcome screen only when no arguments are provided', () => {
    expect(shouldShowWelcome([])).toBe(true);
    expect(shouldShowWelcome(['--help'])).toBe(false);
    expect(shouldShowWelcome(['--version'])).toBe(false);
    expect(shouldShowWelcome(['list', 'agents'])).toBe(false);
  });
});
