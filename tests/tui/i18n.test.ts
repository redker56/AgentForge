import { describe, expect, it } from 'vitest';

import {
  detectTuiLocale,
  getTuiText,
  localizeSkillCategoryLabel,
  resolveTuiLocale,
} from '../../src/tui/i18n.js';

describe('TUI i18n', () => {
  it('detects Chinese from common locale environment variables', () => {
    expect(detectTuiLocale({ env: { LANG: 'zh_CN.UTF-8' }, intlLocale: 'en-US' })).toBe('zh');
    expect(detectTuiLocale({ env: { LC_ALL: 'zh-Hant' }, intlLocale: 'en-US' })).toBe('zh');
    expect(detectTuiLocale({ env: { LANGUAGE: 'zh_CN:en_US' }, intlLocale: 'en-US' })).toBe('zh');
  });

  it('falls back to English for non-Chinese locales', () => {
    expect(detectTuiLocale({ env: { LANG: 'en_US.UTF-8' }, intlLocale: 'en-US' })).toBe('en');
    expect(detectTuiLocale({ env: { LANG: 'ja_JP.UTF-8' }, intlLocale: 'ja-JP' })).toBe('en');
    expect(detectTuiLocale({ env: {}, intlLocale: 'fr-FR' })).toBe('en');
  });

  it('resolves auto, Chinese, and English language preferences', () => {
    expect(resolveTuiLocale('auto', { env: { LANG: 'zh_CN.UTF-8' }, intlLocale: 'en-US' })).toBe(
      'zh'
    );
    expect(resolveTuiLocale('auto', { env: { LANG: 'en_US.UTF-8' }, intlLocale: 'en-US' })).toBe(
      'en'
    );
    expect(resolveTuiLocale('zh', { env: { LANG: 'en_US.UTF-8' }, intlLocale: 'en-US' })).toBe(
      'zh'
    );
    expect(resolveTuiLocale('en', { env: { LANG: 'zh_CN.UTF-8' }, intlLocale: 'zh-CN' })).toBe(
      'en'
    );
  });

  it('returns localized copy and built-in category labels', () => {
    expect(getTuiText('zh').tabs.skills).toBe('Skill');
    expect(getTuiText('zh').skillDetail.dossier).toBe('Skill 档案');
    expect(localizeSkillCategoryLabel('All', 'zh')).toBe('全部');
    expect(localizeSkillCategoryLabel('Uncategorized', 'zh')).toBe('未分类');
    expect(localizeSkillCategoryLabel('research', 'zh')).toBe('research');
  });

  it('documents the command palette language shortcut in help text', () => {
    expect(getTuiText('en').help.rows.some((row) => row.includes('Ctrl+P'))).toBe(true);
    expect(getTuiText('zh').help.rows.some((row) => row.includes('Ctrl+P'))).toBe(true);
  });
});
