/**
 * Validators unit tests -- Sprint 4 behaviors #13-#16
 *
 * Behaviors tested:
 *  - #13: URL validator rejects empty strings and non-URL patterns
 *  - #14: URL validator accepts valid URLs (https://...)
 *  - #15: Name validator rejects spaces and special characters
 *  - #16: Name validator accepts alphanumeric and hyphens
 */

import { describe, it, expect } from 'vitest';

import { validateUrl, validateSkillName } from '../../../src/tui/utils/validators.js';

describe('validateUrl', () => {
  // Behavior #13: URL validator rejects empty/non-URLs
  it('rejects empty string', () => {
    expect(validateUrl('')).toBe('Git URL is required');
  });

  it('rejects whitespace-only string', () => {
    expect(validateUrl('   ')).toBe('Git URL is required');
  });

  it('rejects non-URL patterns', () => {
    expect(validateUrl('not-a-url')).not.toBeNull();
    expect(validateUrl('hello world')).not.toBeNull();
    expect(validateUrl('ftp://something')).not.toBeNull();
    expect(validateUrl('www.example.com')).not.toBeNull();
  });

  // Behavior #14: URL validator accepts valid URLs
  it('accepts valid https URL', () => {
    expect(validateUrl('https://github.com/user/skills-repo')).toBeNull();
  });

  it('accepts valid http URL', () => {
    expect(validateUrl('http://example.com/skills')).toBeNull();
  });

  it('accepts valid git URL with subpath', () => {
    expect(validateUrl('https://gitlab.com/org/team/my-skill')).toBeNull();
  });
});

describe('validateSkillName', () => {
  // Behavior #15: Name validator rejects spaces/special chars
  it('rejects empty string', () => {
    expect(validateSkillName('')).toBe('Name is required');
  });

  it('rejects whitespace-only string', () => {
    expect(validateSkillName('   ')).toBe('Name is required');
  });

  it('rejects names with spaces', () => {
    expect(validateSkillName('my skill')).toBe('No spaces allowed');
  });

  it('rejects names with special characters', () => {
    expect(validateSkillName('my@skill')).not.toBeNull();
    expect(validateSkillName('skill#1')).not.toBeNull();
    expect(validateSkillName('skill.name')).not.toBeNull();
  });

  // Behavior #16: Name validator accepts alphanumeric and hyphens
  it('accepts alphanumeric skill name', () => {
    expect(validateSkillName('react')).toBeNull();
    expect(validateSkillName('myapp')).toBeNull();
  });

  it('accepts names with hyphens', () => {
    expect(validateSkillName('my-skill')).toBeNull();
    expect(validateSkillName('a-b-c')).toBeNull();
    expect(validateSkillName('react-hooks')).toBeNull();
  });

  it('accepts names with numbers', () => {
    expect(validateSkillName('skill123')).toBeNull();
    expect(validateSkillName('react-hooks-v2')).toBeNull();
  });
});
