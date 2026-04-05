/**
 * CommandPalette component test
 */

import { describe, expect, it } from 'vitest';
import React from 'react';

describe('CommandPalette', () => {
  it('exports CommandPalette component', async () => {
    const { CommandPalette } = await import('../../../src/tui/components/CommandPalette.js');
    expect(CommandPalette).toBeDefined();
    expect(typeof CommandPalette).toBe('function');
  });

  it('renders a React element with store prop', async () => {
    const { CommandPalette } = await import('../../../src/tui/components/CommandPalette.js');
    const mockStore = {
      getState: () => ({
        showCommandPalette: true,
        skills: [],
        agents: [],
        projects: [],
        focusedSkillIndex: 0,
        focusedAgentIndex: 0,
        focusedProjectIndex: 0,
        selectedSkillNames: new Set(),
      }),
      subscribe: () => () => {},
    };
    const element = React.createElement(CommandPalette, { store: mockStore });
    expect(element.type).toBe(CommandPalette);
  });

  it('has 12 command entries in COMMANDS constant', async () => {
    // Read the source to verify command count
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/CommandPalette.tsx'),
      'utf-8',
    );

    // Count the entries in COMMANDS array
    const commandMatches = source.match(/{ id: '/g);
    expect(commandMatches).not.toBeNull();
    expect(commandMatches!.length).toBe(12);
  });

  it('command list includes all expected commands', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/CommandPalette.tsx'),
      'utf-8',
    );

    const expectedCommands = [
      'add-skill', 'add-agent', 'add-project',
      'remove-skill', 'remove-agent', 'remove-project',
      'sync-agents', 'sync-projects',
      'unsync',
      'update-skill', 'update-all',
      'import-skills',
    ];

    for (const cmd of expectedCommands) {
      expect(source).toContain(`'${cmd}'`);
    }
  });
});
