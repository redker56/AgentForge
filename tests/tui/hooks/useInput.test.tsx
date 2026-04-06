/**
 * useInput keyboard handler test
 * Verifies the key bindings in useInput.ts
 */

import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

describe('useInput global key handlers', () => {
  const useInputPath = path.join(
    process.cwd(),
    'src/tui/hooks/useInput.ts'
  );
  const source = fs.readFileSync(useInputPath, 'utf-8');

  it('C key handler exists and toggles completion modal', () => {
    expect(source).toMatch(/input\s*===\s*['"]C['"]/);
    expect(source).toMatch(/setCompletionModalOpen/);
  });

  it('R key handler triggers data reload', () => {
    expect(source).toMatch(/input\s*===\s*['"]R['"]/);
    expect(source).toMatch(/loadAllData/);
  });

  it('/ key handler opens search', () => {
    expect(source).toMatch(/input\s*===\s*['"]\/['"]/);
    expect(source).toMatch(/setShowSearch.*true/);
  });

  it('? key handler opens help', () => {
    expect(source).toMatch(/input\s*===\s*['"]\?['"]/);
    expect(source).toMatch(/setShowHelp.*true/);
  });

  it('no ConflictResolution import in useInput.ts', () => {
    expect(source).not.toMatch(/ConflictResolution/);
    expect(source).not.toMatch(/sync-check-service/);
  });

  // Sprint 2: Ctrl+P command palette handler
  it('Ctrl+P handler opens command palette', () => {
    expect(source).toMatch(/input\s*===\s*['"]p['"]/);
    expect(source).toMatch(/key\.ctrl/);
    expect(source).toMatch(/setShowCommandPalette.*true/);
  });

  // Sprint 3: z key functional undo handler
  it('z key handler triggers undo when undoActive is true', () => {
    expect(source).toMatch(/input\s*===\s*['"]z['"]/);
    expect(source).toMatch(/undoActive/);
    expect(source).toMatch(/executeUndo/);
  });

  // Sprint 2: dirty confirm handler
  it('dirty confirm handler checks formDirty state', () => {
    expect(source).toMatch(/formDirty/);
    expect(source).toMatch(/dirtyConfirmActive/);
    expect(source).toMatch(/tabSwitchPending/);
  });

  // Sprint 2: handleSearchInput removed (M-2 fix)
  it('global handleSearchInput function is removed', () => {
    expect(source).not.toMatch(/function\s+handleSearchInput/);
  });

  // Sprint 2: search overlay manages its own input
  it('search overlay input is delegated to component', () => {
    expect(source).toMatch(/showSearch.*\r?\n.*escape/);
  });

  // Sprint 3: Agent remove pushes undo + toast
  it('agent remove handler pushes undo and toast', () => {
    expect(source).toMatch(/pushUndo.*remove-agent/);
    expect(source).toMatch(/pushToast.*Removed agent/);
  });

  // Sprint 3: Project remove pushes undo + toast
  it('project remove handler pushes undo and toast', () => {
    expect(source).toMatch(/pushUndo.*remove-project/);
    expect(source).toMatch(/pushToast.*Removed project/);
  });

  // Sprint 3: Skill delete pushes undo + toast
  it('skill delete handler pushes undo and toast', () => {
    expect(source).toMatch(/pushUndo.*delete-skill/);
    expect(source).toMatch(/pushToast\(msg/);
    expect(source).toMatch(/Deleted/);
  });
});
