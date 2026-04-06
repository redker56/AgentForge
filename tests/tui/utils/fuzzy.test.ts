/**
 * Fuzzy matching engine tests
 */

import { describe, expect, it } from 'vitest';

import { fuzzyMatch } from '../../../src/tui/utils/fuzzy.js';

describe('fuzzyMatch', () => {
  it('returns all items with score 0 and empty matchIndices for empty query', () => {
    const items = [{ name: 'react-hooks' }, { name: 'eslint-rules' }];
    const results = fuzzyMatch('', items, (i) => i.name);

    expect(results).toHaveLength(2);
    expect(results[0].score).toBe(0);
    expect(results[0].matchIndices).toEqual([]);
    expect(results[1].score).toBe(0);
  });

  it('returns empty array when no items match', () => {
    const items = [{ name: 'react-hooks' }, { name: 'eslint-rules' }];
    const results = fuzzyMatch('xyz', items, (i) => i.name);
    expect(results).toHaveLength(0);
  });

  it('does not match non-contiguous characters', () => {
    const items = [{ name: 'my-lint-skill' }];
    const results = fuzzyMatch('mls', items, (i) => i.name);
    expect(results).toHaveLength(0);
  });

  it('returns correct matchIndices for perfect match', () => {
    const items = [{ name: 'skill' }];
    const results = fuzzyMatch('skill', items, (i) => i.name);

    expect(results).toHaveLength(1);
    expect(results[0].matchIndices).toEqual([0, 1, 2, 3, 4]);
  });

  it('prefix match scores higher than mid-string match', () => {
    const items = [{ name: 'my-skill' }, { name: 'skill' }];
    const results = fuzzyMatch('ski', items, (i) => i.name);

    expect(results).toHaveLength(2);
    // 'skill' should score higher (prefix match) than 'my-skill'
    expect(results[0].item.name).toBe('skill');
    expect(results[1].item.name).toBe('my-skill');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('prefix substring scores higher than mid-string substring', () => {
    const items = [{ name: 'abc-test' }, { name: 'x-abc' }];
    const results = fuzzyMatch('abc', items, (i) => i.name);

    expect(results).toHaveLength(2);
    expect(results[0].item.name).toBe('abc-test');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('limits results to 10', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ name: `item-${i}` }));
    const results = fuzzyMatch('item', items, (i) => i.name);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('handles single character query', () => {
    const items = [{ name: 'skill' }, { name: 'other' }];
    const results = fuzzyMatch('s', items, (i) => i.name);

    expect(results).toHaveLength(1);
    expect(results[0].item.name).toBe('skill');
    expect(results[0].matchIndices).toEqual([0]);
  });

  it('is case insensitive', () => {
    const items = [{ name: 'MySkill' }];
    const results = fuzzyMatch('mys', items, (i) => i.name);

    expect(results).toHaveLength(1);
    expect(results[0].item.name).toBe('MySkill');
  });

  it('gives word boundary bonus for matches after hyphen', () => {
    const items = [
      { name: 'my-skill' }, // 's' is at word boundary (after -)
      { name: 'myskill' }, // 's' is not at word boundary
    ];
    const results = fuzzyMatch('s', items, (i) => i.name);

    expect(results).toHaveLength(2);
    // 'my-skill' should score higher due to word boundary bonus
    expect(results[0].item.name).toBe('my-skill');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('gives word boundary bonus for matches after underscore', () => {
    const items = [{ name: 'my_skill' }, { name: 'myskill' }];
    const results = fuzzyMatch('s', items, (i) => i.name);

    expect(results).toHaveLength(2);
    expect(results[0].item.name).toBe('my_skill');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('subsequence ndr matches android-dev-rules', () => {
    const items = [{ name: 'android-dev-rules' }, { name: 'node-rules' }];
    const results = fuzzyMatch('ndr', items, (i) => i.name);

    // 'android-dev-rules' should match: n(0), d(6), r(10)
    // 'node-rules' might not match 'ndr' as subsequence
    const matchedNames = results.map((r) => r.item.name);
    expect(matchedNames).toContain('android-dev-rules');
  });

  it('match indices array length equals query length for substring match', () => {
    const items = [{ name: 'my-awesome-skill' }];
    const results = fuzzyMatch('awe', items, (i) => i.name);

    expect(results).toHaveLength(1);
    expect(results[0].matchIndices).toHaveLength(3);
    expect(results[0].matchIndices).toEqual([3, 4, 5]);
  });

  it('sorts by descending score', () => {
    const items = [{ name: 'abc' }, { name: 'xabc' }, { name: 'abc-xyz' }];
    const results = fuzzyMatch('abc', items, (i) => i.name);

    expect(results.length).toBeGreaterThanOrEqual(2);
    // Verify descending score order
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });
});
