import { cleanup, render } from 'ink-testing-library';
import React, { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageSelector } from '../../../src/tui/components/LanguageSelector.js';
import { createAppStore } from '../../../src/tui/store/index.js';
import { createMockServiceContext } from '../store/actions/mockContext.js';

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const DOWN = '\u001B[B';
const ENTER = '\r';

async function sendInput(instance: ReturnType<typeof render>, input: string): Promise<void> {
  await act(async () => {
    instance.stdin.write(input);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function renderLanguageSelector(
  store: React.ComponentProps<typeof LanguageSelector>['store']
): Promise<ReturnType<typeof render>> {
  let instance: ReturnType<typeof render> | undefined;
  await act(async () => {
    instance = render(<LanguageSelector store={store} />);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  if (!instance) {
    throw new Error('LanguageSelector did not render');
  }

  return instance;
}

describe('LanguageSelector', () => {
  afterEach(async () => {
    await act(async () => {
      cleanup();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  it('renders Chinese language choices when the current locale is zh', async () => {
    const store = createAppStore(createMockServiceContext(), 'zh', 'auto');
    store.getState().setLanguageSelectorOpen(true);

    const { lastFrame } = await renderLanguageSelector(store);
    const frame = lastFrame() ?? '';

    expect(frame).toContain('语言');
    expect(frame).toContain('自动（跟随系统）');
    expect(frame).toContain('中文');
    expect(frame).toContain('English');
    expect(frame).toContain('↑/↓ 选择，Enter 保存，Esc 取消');
  });

  it('saves English and updates shell language state', async () => {
    const ctx = createMockServiceContext();
    const store = createAppStore(ctx, 'zh', 'auto');
    store.getState().setLanguageSelectorOpen(true);

    const instance = await renderLanguageSelector(store);
    await sendInput(instance, DOWN);
    await sendInput(instance, DOWN);
    await sendInput(instance, ENTER);

    expect(ctx.commands.setTuiLanguagePreference).toHaveBeenCalledWith('en');
    expect(store.getState().shellState.languagePreference).toBe('en');
    expect(store.getState().shellState.locale).toBe('en');
    expect(store.getState().shellState.languageSelectorOpen).toBe(false);
  });
});
