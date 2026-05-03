import { describe, expect, it, vi } from 'vitest';

import { handleGlobalShellInput } from '../../../src/tui/hooks/input/global.js';
import { handleBlockingShellInput } from '../../../src/tui/hooks/input/overlays.js';
import { routeActiveTabInput } from '../../../src/tui/hooks/input/tabRouter.js';
import type { InputRouteContext } from '../../../src/tui/hooks/input/types.js';
import { ALL_SKILL_CATEGORY_FILTER } from '../../../src/types.js';

type MutableState = ReturnType<typeof createState>;

function createState(overrides: Record<string, unknown> = {}) {
  const state = {
    shellState: {
      activeTab: 'skills',
      searchQuery: '',
      detailOverlayVisible: false,
      detailSkillName: null,
      widthBand: 'standard',
      formDirty: false,
      showSearch: false,
      showHelp: false,
      showCommandPalette: false,
      confirmState: null,
      formState: null,
      conflictState: null,
      focusedConflictIndex: 0,
      completionModalOpen: null,
      searchResultIndex: 0,
      tabSwitchPending: null,
      dirtyConfirmActive: false,
      undoBuffer: null,
      undoActive: false,
      toastQueue: [],
      activeToast: null,
      updateProgressItems: [],
      locale: 'en',
    },
    skillsBrowserState: {
      focusedIndex: 0,
      selectedNames: new Set<string>(),
      activeCategoryFilter: ALL_SKILL_CATEGORY_FILTER,
    },
    agentsBrowserState: {
      focusedIndex: 0,
      viewMode: 'master',
      focusedSkillIndex: 0,
      selectedSkillRowIds: new Set<string>(),
      activeSkillFilter: 'all',
    },
    projectsBrowserState: {
      focusedIndex: 0,
      viewMode: 'master',
      focusedSkillIndex: 0,
      selectedSkillRowIds: new Set<string>(),
      activeSkillFilter: 'all',
    },
    syncWorkflowState: {
      step: 'select-op',
      operation: null,
      selectedSkillNames: new Set<string>(),
      unsyncScope: null,
      selectedTargetIds: new Set<string>(),
      projectUnsyncMode: null,
      selectedAgentTypes: new Set<string>(),
      loadingTargets: false,
      mode: 'copy',
      results: [],
      focusedIndex: 0,
      preview: null,
      previewError: null,
    },
    importWorkflowState: {
      step: 'select-source-type',
      sourceType: 'project',
      sourceId: null,
      sourceLabel: null,
      selectedSkillNames: new Set<string>(),
      results: [],
      focusedIndex: 0,
      discoveredSkills: [],
    },
    skills: [
      {
        name: 'focus-skill',
        categories: [],
        source: { type: 'git', url: 'https://example.com/repo.git' },
      },
    ],
    skillDetails: {
      'focus-skill': {
        syncedTo: [{ agentId: 'claude' }],
        syncedProjects: [{ projectId: 'proj-1', agentType: 'codex' }],
      },
    },
    agents: [{ id: 'codex', name: 'Codex', basePath: '/agents/codex', skillsDirName: 'agents' }],
    agentDetails: {
      codex: {
        sections: [
          {
            id: 'registry',
            title: 'Registry',
            rows: [
              {
                rowId: 'row-agent-skill',
                name: 'focus-skill',
                registrySkillName: 'focus-skill',
                syncMode: 'copy',
              },
            ],
          },
        ],
      },
    },
    projects: [{ id: 'proj-1', path: '/projects/one', addedAt: '2026-04-18' }],
    projectDetails: {
      'proj-1': {
        sections: [
          {
            id: 'project',
            title: 'Project',
            rows: [
              {
                rowId: 'row-project-skill',
                name: 'focus-skill',
                registrySkillName: 'focus-skill',
                projectId: 'proj-1',
                agentId: 'codex',
              },
            ],
          },
        ],
      },
    },
    setActiveTab: vi.fn((tab: string) => {
      state.shellState.activeTab = tab;
    }),
    setShowHelp: vi.fn((show: boolean) => {
      state.shellState.showHelp = show;
    }),
    setShowSearch: vi.fn((show: boolean) => {
      state.shellState.showSearch = show;
    }),
    setShowCommandPalette: vi.fn((show: boolean) => {
      state.shellState.showCommandPalette = show;
    }),
    setFormDirty: vi.fn((dirty: boolean) => {
      state.shellState.formDirty = dirty;
    }),
    setDirtyConfirmActive: vi.fn((active: boolean) => {
      state.shellState.dirtyConfirmActive = active;
    }),
    setTabSwitchPending: vi.fn((tab: string | null) => {
      state.shellState.tabSwitchPending = tab;
    }),
    setCompletionModalOpen: vi.fn((open: boolean | null) => {
      state.shellState.completionModalOpen = open;
    }),
    executeUndo: vi.fn(),
    loadAllData: vi.fn(() => Promise.resolve(undefined)),
    setSyncFormSelectedSkillNames: vi.fn((names: Set<string>) => {
      state.syncWorkflowState.selectedSkillNames = names;
    }),
    setSyncFormOperation: vi.fn((operation: string | null) => {
      state.syncWorkflowState.operation = operation;
    }),
    setSyncFormUnsyncScope: vi.fn((scope: string | null) => {
      state.syncWorkflowState.unsyncScope = scope;
    }),
    setSyncFormProjectUnsyncMode: vi.fn((mode: string | null) => {
      state.syncWorkflowState.projectUnsyncMode = mode;
    }),
    setSyncFormSelectedTargetIds: vi.fn((ids: Set<string>) => {
      state.syncWorkflowState.selectedTargetIds = ids;
    }),
    setSyncFormSelectedAgentTypes: vi.fn((types: Set<string>) => {
      state.syncWorkflowState.selectedAgentTypes = types;
    }),
    setSyncFormStep: vi.fn((step: string) => {
      state.syncWorkflowState.step = step;
    }),
    setFocusedConflictIndex: vi.fn(),
    setConfirmState: vi.fn((confirmState: unknown) => {
      state.shellState.confirmState = confirmState;
    }),
    setDetailOverlayVisible: vi.fn((visible: boolean) => {
      state.shellState.detailOverlayVisible = visible;
    }),
    setDetailSkillName: vi.fn((name: string | null) => {
      state.shellState.detailSkillName = name;
    }),
    moveFocusUp: vi.fn(),
    moveFocusDown: vi.fn(),
    setFocusedSkillIndex: vi.fn((index: number) => {
      state.skillsBrowserState.focusedIndex = index;
    }),
    cycleSkillCategoryFilter: vi.fn(),
    toggleSkillSelection: vi.fn(),
    setFormState: vi.fn(),
    setAgentViewMode: vi.fn((mode: string) => {
      state.agentsBrowserState.viewMode = mode;
    }),
    clearAgentSkillSelection: vi.fn(),
    setFocusedAgentSkillIndex: vi.fn((index: number) => {
      state.agentsBrowserState.focusedSkillIndex = index;
    }),
    setFocusedAgentIndex: vi.fn((index: number) => {
      state.agentsBrowserState.focusedIndex = index;
    }),
    setActiveAgentSkillFilter: vi.fn(),
    toggleAgentSkillSelection: vi.fn(),
    loadAgentDetail: vi.fn(() => Promise.resolve(undefined)),
    setProjectViewMode: vi.fn((mode: string) => {
      state.projectsBrowserState.viewMode = mode;
    }),
    clearProjectSkillSelection: vi.fn(),
    setFocusedProjectSkillIndex: vi.fn((index: number) => {
      state.projectsBrowserState.focusedSkillIndex = index;
    }),
    setFocusedProjectIndex: vi.fn((index: number) => {
      state.projectsBrowserState.focusedIndex = index;
    }),
    setActiveProjectSkillFilter: vi.fn(),
    toggleProjectSkillSelection: vi.fn(),
    loadProjectDetail: vi.fn(() => Promise.resolve(undefined)),
    refreshSkills: vi.fn(() => Promise.resolve(undefined)),
    removeSkill: vi.fn(() => Promise.resolve(undefined)),
    clearSelection: vi.fn(),
    pushUndo: vi.fn(),
    pushToast: vi.fn(),
    removeAgent: vi.fn(() => Promise.resolve(undefined)),
    removeProject: vi.fn(() => Promise.resolve(undefined)),
    ...overrides,
  };

  return state;
}

function createContext(
  state: MutableState,
  input: string,
  key: InputRouteContext['key'] = {}
): InputRouteContext {
  return {
    store: {
      getState: () => state,
    } as InputRouteContext['store'],
    input,
    key,
    state,
  };
}

describe('TUI input routing', () => {
  it('dirty confirm accepts discard and switches tabs before anything else', () => {
    const state = createState();
    state.shellState.dirtyConfirmActive = true;
    state.shellState.tabSwitchPending = 'projects';

    const handled = handleBlockingShellInput(createContext(state, 'y'));

    expect(handled).toBe(true);
    expect(state.setFormDirty).toHaveBeenCalledWith(false);
    expect(state.setDirtyConfirmActive).toHaveBeenCalledWith(false);
    expect(state.setTabSwitchPending).toHaveBeenCalledWith(null);
    expect(state.setActiveTab).toHaveBeenCalledWith('projects');
  });

  it('search overlay blocks routing and only allows escape dismissal', () => {
    const state = createState();
    state.shellState.showSearch = true;

    const handled = handleBlockingShellInput(createContext(state, '', { escape: true }));

    expect(handled).toBe(true);
    expect(state.setShowSearch).toHaveBeenCalledWith(false);
  });

  it('global tab switching routes through dirty-confirm when the current form is dirty', () => {
    const state = createState();
    state.shellState.formDirty = true;

    const handled = handleGlobalShellInput(createContext(state, '', { rightArrow: true }));

    expect(handled).toBe(true);
    expect(state.setTabSwitchPending).toHaveBeenCalledWith('agents');
    expect(state.setDirtyConfirmActive).toHaveBeenCalledWith(true);
    expect(state.setActiveTab).not.toHaveBeenCalled();
  });

  it('global ctrl+p opens the command palette', () => {
    const state = createState();

    const handled = handleGlobalShellInput(createContext(state, 'p', { ctrl: true }));

    expect(handled).toBe(true);
    expect(state.setShowCommandPalette).toHaveBeenCalledWith(true);
  });

  it('skills tab Home and End jump to the first and last visible Skill', () => {
    const state = createState();
    state.skills = [
      { name: 'first', categories: [], source: { type: 'git', url: 'https://example.com/a.git' } },
      { name: 'second', categories: [], source: { type: 'git', url: 'https://example.com/b.git' } },
      { name: 'third', categories: [], source: { type: 'git', url: 'https://example.com/c.git' } },
    ];
    state.skillsBrowserState.focusedIndex = 1;

    expect(routeActiveTabInput(createContext(state, '', { home: true }))).toBe(true);
    expect(state.setFocusedSkillIndex).toHaveBeenCalledWith(0);

    expect(routeActiveTabInput(createContext(state, '', { end: true }))).toBe(true);
    expect(state.setFocusedSkillIndex).toHaveBeenCalledWith(2);
  });

  it('localizes destructive confirmations in Chinese mode', () => {
    const state = createState();
    state.shellState.locale = 'zh';

    expect(routeActiveTabInput(createContext(state, 'd'))).toBe(true);

    expect(state.setConfirmState).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '删除 1 个 Skill',
        message: '将移除 1 个用户级同步和 1 个项目同步。磁盘上的文件也会被删除。',
      })
    );
  });

  it('agents tab Home and End jump within master and context Skill lists', () => {
    const state = createState();
    state.shellState.activeTab = 'agents';
    state.agents = [
      { id: 'codex', name: 'Codex', basePath: '/agents/codex', skillsDirName: 'agents' },
      { id: 'custom', name: 'Custom', basePath: '/agents/custom', skillsDirName: 'custom' },
    ];
    state.agentsBrowserState.focusedIndex = 0;

    expect(routeActiveTabInput(createContext(state, '', { end: true }))).toBe(true);
    expect(state.setFocusedAgentIndex).toHaveBeenCalledWith(1);

    state.agentsBrowserState.focusedIndex = 0;
    state.agentsBrowserState.viewMode = 'skills';
    state.agentDetails.codex.sections[0].rows.push({
      rowId: 'row-agent-skill-2',
      name: 'second-skill',
      registrySkillName: 'second-skill',
      syncMode: 'copy',
      isImported: true,
    });
    state.agentsBrowserState.focusedSkillIndex = 1;

    expect(routeActiveTabInput(createContext(state, '', { home: true }))).toBe(true);
    expect(state.setFocusedAgentSkillIndex).toHaveBeenCalledWith(0);
  });

  it('projects tab Home and End jump within master and context Skill lists', () => {
    const state = createState();
    state.shellState.activeTab = 'projects';
    state.projects = [
      { id: 'proj-1', path: '/projects/one', addedAt: '2026-04-18' },
      { id: 'proj-2', path: '/projects/two', addedAt: '2026-04-19' },
    ];
    state.projectsBrowserState.focusedIndex = 0;

    expect(routeActiveTabInput(createContext(state, '', { end: true }))).toBe(true);
    expect(state.setFocusedProjectIndex).toHaveBeenCalledWith(1);

    state.projectsBrowserState.focusedIndex = 0;
    state.projectsBrowserState.viewMode = 'skills';
    state.projectDetails['proj-1'].sections[0].rows.push({
      rowId: 'row-project-skill-2',
      name: 'second-skill',
      registrySkillName: 'second-skill',
      projectId: 'proj-1',
      agentId: 'codex',
      isImported: true,
    });
    state.projectsBrowserState.focusedSkillIndex = 0;

    expect(routeActiveTabInput(createContext(state, '', { end: true }))).toBe(true);
    expect(state.setFocusedProjectSkillIndex).toHaveBeenCalledWith(1);
  });

  it('skills tab x routes unsync through scope selection instead of executing immediately', () => {
    const state = createState();

    const handled = routeActiveTabInput(createContext(state, 'x'));

    expect(handled).toBe(true);
    expect(state.setSyncFormOperation).toHaveBeenCalledWith('unsync');
    expect(state.setSyncFormUnsyncScope).toHaveBeenCalledWith(null);
    expect(state.setSyncFormProjectUnsyncMode).toHaveBeenCalledWith(null);
    expect(state.setSyncFormSelectedTargetIds).toHaveBeenCalledWith(new Set());
    expect(state.setSyncFormStep).toHaveBeenCalledWith('select-unsync-scope');
    expect(state.setActiveTab).toHaveBeenCalledWith('sync');
  });

  it('agent context unsync keeps the focused agent as the exact target', () => {
    const state = createState();
    state.shellState.activeTab = 'agents';
    state.agentsBrowserState.viewMode = 'skills';

    const handled = routeActiveTabInput(createContext(state, 'x'));

    expect(handled).toBe(true);
    expect(state.setSyncFormUnsyncScope).toHaveBeenCalledWith('agents');
    expect(state.setSyncFormSelectedTargetIds).toHaveBeenCalledWith(new Set(['codex']));
    expect(state.setSyncFormStep).toHaveBeenCalledWith('confirm');
  });

  it('project context unsync keeps exact project-agent pairs', () => {
    const state = createState();
    state.shellState.activeTab = 'projects';
    state.projectsBrowserState.viewMode = 'skills';

    const handled = routeActiveTabInput(createContext(state, 'x'));

    expect(handled).toBe(true);
    expect(state.setSyncFormUnsyncScope).toHaveBeenCalledWith('projects');
    expect(state.setSyncFormProjectUnsyncMode).toHaveBeenCalledWith('specific');
    expect(state.setSyncFormSelectedTargetIds).toHaveBeenCalledWith(new Set(['proj-1:codex']));
    expect(state.setSyncFormStep).toHaveBeenCalledWith('confirm');
  });
});
