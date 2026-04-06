/**
 * UndoEngine unit tests -- timer-managed undo buffer with 8s window, 250ms tick
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { createUndoEngine, type UndoEngine } from '../../../src/tui/utils/undo-engine.js';

describe('createUndoEngine', () => {
  let engine: UndoEngine;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    engine?.destroy();
    vi.useRealTimers();
  });

  it('pushing entry starts 250ms tick timer', () => {
    engine = createUndoEngine(250, 8000);
    expect(engine.isActive()).toBe(false);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });
    expect(engine.isActive()).toBe(true);
  });

  it('remainingMs decrements on each tick', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });

    expect(engine.getRemainingMs()).toBe(8000);

    vi.advanceTimersByTime(250);
    expect(engine.getRemainingMs()).toBe(7750);

    vi.advanceTimersByTime(250);
    expect(engine.getRemainingMs()).toBe(7500);
  });

  it('entry auto-clears when remainingMs reaches 0', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });

    expect(engine.isActive()).toBe(true);

    vi.advanceTimersByTime(8000);

    expect(engine.isActive()).toBe(false);
    expect(engine.getRemainingMs()).toBe(0);
    expect(engine.get()).toBe(null);
  });

  it('pushing new entry replaces and resets timer', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test1' }, timestamp: Date.now() });

    vi.advanceTimersByTime(1000);
    expect(engine.getRemainingMs()).toBe(7000);

    engine.push({ action: 'remove-agent', snapshot: { id: 'agent1' }, timestamp: Date.now() });
    expect(engine.getRemainingMs()).toBe(8000);
    expect(engine.get()?.action).toBe('remove-agent');
  });

  it('clear stops timer and clears buffer', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });
    expect(engine.isActive()).toBe(true);

    engine.clear();

    expect(engine.isActive()).toBe(false);
    expect(engine.get()).toBe(null);
    expect(engine.getRemainingMs()).toBe(0);
  });

  it('isUndoActive returns true while buffer has remaining time, false after expiry', () => {
    engine = createUndoEngine(250, 8000);
    expect(engine.isActive()).toBe(false);

    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });
    expect(engine.isActive()).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(engine.isActive()).toBe(true);

    vi.advanceTimersByTime(4000);
    expect(engine.isActive()).toBe(false);
  });

  it('pop returns entry and stops timer', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: 12345 });

    const entry = engine.pop();

    expect(entry).not.toBeNull();
    expect(entry?.action).toBe('delete-skill');
    expect(entry?.snapshot).toEqual({ name: 'test' });
    expect(entry?.timestamp).toBe(12345);
    expect(engine.isActive()).toBe(false);
    expect(engine.get()).toBe(null);
  });

  it('pop returns null when no entry exists', () => {
    engine = createUndoEngine(250, 8000);
    expect(engine.pop()).toBe(null);
  });

  it('destroy is idempotent and stops timer', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'test' }, timestamp: Date.now() });

    engine.destroy();
    engine.destroy();

    expect(engine.isActive()).toBe(false);
  });

  it('tick returns 0 when no entry exists', () => {
    engine = createUndoEngine(250, 8000);
    expect(engine.tick()).toBe(0);
  });

  it('getRemainingMs returns 0 when no entry exists', () => {
    engine = createUndoEngine(250, 8000);
    expect(engine.getRemainingMs()).toBe(0);
  });

  it('get returns the current entry without stopping timer', () => {
    engine = createUndoEngine(250, 8000);
    engine.push({ action: 'delete-skill', snapshot: { name: 'my-skill' }, timestamp: 10000 });

    const snapshot = engine.get();
    expect(snapshot?.action).toBe('delete-skill');
    expect(engine.isActive()).toBe(true);
  });
});
