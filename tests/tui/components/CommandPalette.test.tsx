/**
 * CommandPalette component test
 */

import React from 'react';
import { describe, expect, it } from 'vitest';

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

  it('only exposes the language command for now', async () => {
    // Read the source to verify command count
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/CommandPalette.tsx'),
      'utf-8'
    );

    // Count the entries in COMMANDS array
    const commandMatches = source.match(/{ id: '/g);
    expect(commandMatches).not.toBeNull();
    expect(commandMatches?.length).toBe(1);
  });

  it('command list includes only change language', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/CommandPalette.tsx'),
      'utf-8'
    );

    const removedCommands = [
      'add-skill',
      'add-agent',
      'add-project',
      'remove-skill',
      'remove-agent',
      'remove-project',
      'sync-agents',
      'sync-projects',
      'unsync',
      'update-skill',
      'update-all',
      'categorize-skill',
      'import-skills',
    ];

    expect(source).toContain("'change-language'");
    for (const cmd of removedCommands) {
      expect(source).not.toContain(`'${cmd}'`);
    }
  });

  it('routes the language command to the language selector', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const source = fs.readFileSync(
      path.join(process.cwd(), 'src/tui/components/CommandPalette.tsx'),
      'utf-8'
    );

    expect(source).toContain('getLanguagePreferenceIndex');
    expect(source).toContain('state.setLanguageSelectorOpen(true)');
  });
});
