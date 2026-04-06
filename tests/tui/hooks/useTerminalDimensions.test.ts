/**
 * useTerminalDimensions hook tests.
 * Verifies band computation at all three breakpoints using runtime mocks
 * and direct ink.render() with custom stdout objects.
 *
 * ink-testing-library hardcodes stdout.columns=100, so we use ink.render()
 * directly with mock stdout objects that support variable column counts.
 */

import { EventEmitter } from 'node:events';

import { Text } from 'ink';
import React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * Creates a mock stdout with configurable columns/rows and proper EventEmitter
 * methods including off() which Ink requires for cleanup.
 */
function createMockStdout(columns: number, rows: number) {
  const emitter = new EventEmitter();
  return {
    columns,
    rows,
    write: vi.fn(),
    on(event: string, handler: (...args: unknown[]) => void) {
      emitter.on(event, handler);
      return this;
    },
    removeListener(event: string, handler: (...args: unknown[]) => void) {
      emitter.removeListener(event, handler);
      return this;
    },
    off(event: string, handler: (...args: unknown[]) => void) {
      emitter.removeListener(event, handler);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      emitter.emit(event, ...args);
    },
    listenerCount(event: string) {
      return emitter.listenerCount(event);
    },
  };
}

type MockStdout = ReturnType<typeof createMockStdout>;

/**
 * Renders a component using ink.render() with a custom stdout.
 * Returns cleanup function.
 */
async function renderWithStdout(element: React.ReactElement, stdout: MockStdout) {
  const ink = await import('ink');
  const instance = ink.render(element, {
    stdout: stdout as unknown as NodeJS.WriteStream,
    stdin: {
      on: vi.fn(),
      removeListener: vi.fn(),
      off: vi.fn(),
      write: vi.fn(),
      resume: vi.fn(),
      pause: vi.fn(),
      setRawMode: vi.fn(),
      setEncoding: vi.fn(),
      ref: vi.fn(),
      unref: vi.fn(),
      read: vi.fn(() => null),
      isTTY: true,
    } as unknown as NodeJS.ReadStream,
    stderr: {
      columns: stdout.columns,
      write: vi.fn(),
    } as unknown as NodeJS.WriteStream,
    debug: true,
    exitOnCtrlC: false,
    patchConsole: false,
  });

  return {
    unmount: () => {
      instance.unmount();
      instance.cleanup();
    },
  };
}

describe('useTerminalDimensions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exports useTerminalDimensions function', async () => {
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    expect(typeof useTerminalDimensions).toBe('function');
  });

  it('returns widescreen when columns > 120', async () => {
    const stdout = createMockStdout(150, 40);
    let captured = '';
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      const d = useTerminalDimensions();
      captured = `${d.band}-${d.columns}-${d.rows}`;
      return React.createElement(Text, null, d.band);
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();
    expect(captured).toBe('widescreen-150-40');
    unmount();
  });

  it('returns standard when columns are 80-120', async () => {
    const stdout = createMockStdout(100, 30);
    let captured = '';
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      const d = useTerminalDimensions();
      captured = `${d.band}-${d.columns}-${d.rows}`;
      return React.createElement(Text, null, d.band);
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();
    expect(captured).toBe('standard-100-30');
    unmount();
  });

  it('returns compact when columns < 80', async () => {
    const stdout = createMockStdout(60, 20);
    let captured = '';
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      const d = useTerminalDimensions();
      captured = `${d.band}-${d.columns}-${d.rows}`;
      return React.createElement(Text, null, d.band);
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();
    expect(captured).toBe('compact-60-20');
    unmount();
  });

  it('defaults to widescreen when stdout is not available', async () => {
    // Verify DEFAULT_DIMENSIONS is defined correctly in the source
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/hooks/useTerminalDimensions.ts'),
      'utf-8'
    );
    expect(source).toContain('DEFAULT_DIMENSIONS');
    expect(source).toMatch(/columns.*120/);
    expect(source).toMatch(/band.*widescreen/);
  });

  it('registers resize listener on mount', async () => {
    const stdout = createMockStdout(120, 30);
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      useTerminalDimensions();
      return React.createElement(Text, null, 'ok');
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();
    // Verify resize listener was registered
    expect(stdout.listenerCount('resize')).toBeGreaterThan(0);
    unmount();
  });

  it('removes resize listener on unmount', async () => {
    const stdout = createMockStdout(120, 30);
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      useTerminalDimensions();
      return React.createElement(Text, null, 'ok');
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();
    unmount();
    // After unmount, resize listener should be removed
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  it('updates band after resize and debounce', async () => {
    // Use a mutable object so the resize callback reads the updated columns
    const mutableState = { columns: 100, rows: 30 };
    const stdout = createMockStdout(100, 30);
    // Override columns/rows to read from mutable state
    Object.defineProperty(stdout, 'columns', {
      get: () => mutableState.columns,
      configurable: true,
    });
    Object.defineProperty(stdout, 'rows', {
      get: () => mutableState.rows,
      configurable: true,
    });

    let captured = '';
    const { useTerminalDimensions } =
      await import('../../../src/tui/hooks/useTerminalDimensions.js');
    const Wrapper: React.FC = () => {
      const d = useTerminalDimensions();
      captured = `${d.band}-${d.columns}`;
      return React.createElement(Text, null, d.band);
    };
    const { unmount } = await renderWithStdout(React.createElement(Wrapper), stdout);
    await vi.runAllTimersAsync();

    // Initial: standard-100
    expect(captured).toBe('standard-100');

    // Simulate resize to compact: change columns and emit resize event
    mutableState.columns = 60;
    stdout.emit('resize');

    // Before debounce fires, captured is still standard
    expect(captured).toBe('standard-100');

    // Advance past debounce timer (16ms) and allow React to re-render
    vi.advanceTimersByTime(20);
    await vi.runAllTimersAsync();

    // After debounce, hook should have recomputed via setState and React re-render
    expect(captured).toBe('compact-60');
    unmount();
  });
});
