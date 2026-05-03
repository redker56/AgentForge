import { normalizeTuiLanguagePreference, type TuiLanguagePreference } from '../types.js';

export type TuiLocale = 'en' | 'zh';

interface LocaleDetectionInput {
  env?: NodeJS.ProcessEnv;
  intlLocale?: string | null;
}

type TuiTabId = 'skills' | 'agents' | 'projects' | 'sync' | 'import';

function isChineseLocale(value: string | undefined | null): boolean {
  if (!value) return false;

  return value
    .split(/[:;,]/)
    .map((part) => part.trim().toLowerCase().replace(/_/g, '-'))
    .some((part) => part === 'zh' || part.startsWith('zh-'));
}

export function detectTuiLocale(input: LocaleDetectionInput = {}): TuiLocale {
  const env = input.env ?? process.env;
  const intlLocale =
    input.intlLocale ??
    ((): string | null => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().locale;
      } catch {
        return null;
      }
    })();

  const candidates = [env.LC_ALL, env.LC_MESSAGES, env.LANGUAGE, env.LANG, intlLocale];

  return candidates.some(isChineseLocale) ? 'zh' : 'en';
}

export function normalizeTuiLocale(locale: TuiLocale | undefined | null): TuiLocale {
  return locale === 'zh' ? 'zh' : 'en';
}

export function resolveTuiLocale(
  preference: TuiLanguagePreference | undefined | null,
  input: LocaleDetectionInput = {}
): TuiLocale {
  const normalized = normalizeTuiLanguagePreference(preference);
  return normalized === 'auto' ? detectTuiLocale(input) : normalized;
}

function plural(count: number, singular: string, pluralValue: string): string {
  return count === 1 ? singular : pluralValue;
}

export const tuiText = {
  en: {
    tabs: {
      skills: 'Skills',
      agents: 'Agents',
      projects: 'Projects',
      sync: 'Sync',
      import: 'Import',
    } satisfies Record<TuiTabId, string>,
    shortTabs: {
      skills: 'S',
      agents: 'A',
      projects: 'P',
      sync: 'Sy',
      import: 'I',
    } satisfies Record<TuiTabId, string>,
    subtitle: 'skill workbench',
    breadcrumb: {
      context: 'Context',
    },
    common: {
      all: 'All',
      uncategorized: 'Uncategorized',
      imported: 'Imported',
      unimported: 'Unimported',
      none: '(none)',
      clearAll: '(clear all)',
      never: 'Never',
      unknown: 'Unknown',
      local: 'local',
      project: 'project',
      git: 'git',
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      back: 'Back',
      skip: 'Skip',
      link: 'Link',
      success: 'success',
      error: 'error',
      skipped: 'skipped',
      updated: 'updated',
      update: 'update',
      category: 'Category',
      browse: 'Browse',
      focus: 'Focus',
      selected: 'Selected',
      actions: 'Actions',
      pressEscToClose: 'Press Esc to close',
      enterCloseEscClose: 'Enter:Close Esc:Close',
      enterConfirmEscBack: '[Enter] Confirm  [Esc] Back',
      enterConfirmEscCancel: '[Enter] Confirm  [Esc] Cancel',
      upDownChooseEnterContinue: 'Up/Down to choose, Enter to continue',
      upDownNavigateSpaceToggleEnterContinue:
        'Up/Down to navigate, Space to toggle, Enter to continue',
      upDownSelectEnterContinue: 'Up/Down to select, Enter to continue',
      spaceToggleEnterConfirmEscCancel: 'Space:Toggle Enter:Confirm Esc:Cancel',
      tabNextEnterSubmitEscCancel: 'Tab:Next Field Enter:Submit Esc:Cancel',
      pleaseWait: 'Please wait...',
      processing: 'Processing...',
      operationCompleted: 'Operation completed successfully.',
      noCommandsFound: 'No commands found',
      newFlow: 'New flow',
      newImport: 'New import',
      importedLocked: '[IMPORTED]',
      alreadyImportedSuffix: '(already imported)',
      ok: 'OK',
      fail: 'FAIL',
    },
    empty: {
      loadingSkills: 'Loading Skills...',
      loadingAgents: 'Loading Agents...',
      loadingProjects: 'Loading projects...',
      skills: 'No skills installed. Press `a` to add one.',
      agents: 'No agents registered. Press `a` to add a custom agent.',
      projects: 'No projects registered. Press `a` to add a project.',
      contextSkills: 'No context skills available.',
      noSkillsFilter: 'No skills match the current filter.',
    },
    validation: {
      gitUrlRequired: 'Git URL is required',
      validUrl: 'Enter a valid URL (https://...)',
      nameRequired: 'Name is required',
      noSpaces: 'No spaces allowed',
      alphanumericHyphens: 'Only alphanumeric and hyphens',
      idRequired: 'ID is required',
      identifier: 'Only letters, numbers, hyphens, underscores',
      required: (fieldName: string): string => `${fieldName} is required`,
      builtInAgentId: 'Cannot use built-in agent ID',
    },
    app: {
      compactWarning:
        '⚠ Compact terminal layout active -- widen to 80+ columns for the full detail view',
      unsavedDiscard: 'Unsaved changes -- Discard? [y/N]',
    },
    status: {
      labels: {
        delete: 'Delete',
        add: 'Add',
        import: 'Import',
        sync: 'Sync',
        projectSync: 'ProjSync',
        update: 'Update',
        updateAll: 'UpdateAll',
        unsync: 'Unsync',
        categorize: 'Categorize',
        category: 'Category',
        remove: 'Remove',
        open: 'Open',
        toggle: 'Toggle',
        confirm: 'Confirm',
        back: 'Back',
        detail: 'Detail',
        browse: 'Browse',
        search: 'Search',
        help: 'Help',
        quit: 'Quit',
      },
      countSummary: (
        mode: 'full' | 'medium' | 'compact' | 'micro',
        skills: number,
        agents: number,
        projects: number,
        selected: number
      ): string => {
        const selectedSuffix =
          selected > 0
            ? mode === 'micro'
              ? ` / ${selected}`
              : mode === 'full'
                ? ` / ${selected} selected`
                : ` / ${selected} sel`
            : '';

        switch (mode) {
          case 'full':
            return `Library ${skills} skills / ${agents} agents / ${projects} projects${selectedSuffix}`;
          case 'medium':
            return `Library ${skills} sk / ${agents} ag / ${projects} proj${selectedSuffix}`;
          case 'compact':
            return `${skills} sk / ${agents} ag / ${projects} pr${selectedSuffix}`;
          case 'micro':
            return `${skills}/${agents}/${projects}${selectedSuffix}`;
        }
      },
      library: 'Library ',
      skillsFull: ' skills',
      skillsCompact: ' sk',
      agentsFull: ' agents',
      agentsCompact: ' ag',
      projectsFull: ' projects',
      projectsMedium: ' proj',
      projectsCompact: ' pr',
      selectedFull: ' selected',
      selectedCompact: ' sel',
      deletedUndo: (name: string, seconds: number): string =>
        `Deleted '${name}' - Undo (${seconds}s)`,
      restored: (name: string): string => `Restored '${name}'`,
    },
    mutations: {
      deleteSkillsTitle: (count: number): string => `Delete ${count} skill(s)`,
      deleteSkillsMessage: (agentSyncs: number, projectSyncs: number): string =>
        `This will remove ${agentSyncs} user-level sync(s) and ${projectSyncs} project sync(s). Files on disk will be deleted.`,
      deletedSkill: (name: string): string => `Deleted '${name}'`,
      deletedSkills: (count: number): string => `Deleted ${count} skill(s)`,
      removeAgentTitle: (name: string): string => `Remove Agent "${name}"`,
      removeAgentMessage:
        'Files stay on disk. AgentForge will forget sync references tied to this Agent.',
      removedAgent: (name: string): string => `Removed agent '${name}'`,
      removeProjectTitle: (id: string): string => `Remove Project "${id}"`,
      removeProjectMessage:
        'Files stay on disk. AgentForge will forget the project and its recorded sync references.',
      removedProject: (id: string): string => `Removed project '${id}'`,
      skillInstalled: (name: string): string => `Skill '${name}' installed`,
    },
    help: {
      title: 'Keyboard Shortcuts',
      subtitle: 'Warm desk controls for the full AgentForge TUI.',
      navigation: 'Navigation',
      selection: 'Selection',
      actions: 'Actions',
      closeHint: 'Press Esc or ? to close',
      rows: [
        ' Left/Right Previous/next tab',
        ' 1-5 Jump to tab',
        ' Up/Down Move focus',
        ' Home/End Jump to start/end',
        ' Space Toggle selection',
        ' Enter Open list / detail / execute',
        ' Esc Back from detail or context list',
        ' / Open search',
        ' ? Toggle this help',
        ' Ctrl+P Change language',
        ' i Import visible context skill(s)',
        ' c Categorize selected skill(s)',
        ' [ / ] Previous/next category or context filter',
        ' u Update selected skill(s)',
        ' U Update all git-backed skills',
        ' x Unsync selected skill(s)',
        ' R Refresh all data',
        ' q Quit',
      ],
    },
    search: {
      title: 'Search',
      query: 'Query',
      hint: 'Type to search in the current tab',
      noResults: (query: string): string => `No results for "${query}"`,
      summary: (count: number, query: string, overflow: string): string =>
        `${count} ${plural(count, 'result', 'results')} for "${query}"${overflow}`,
    },
    commands: {
      title: 'Command palette',
      command: 'Command',
      entries: {
        changeLanguage: 'Change language',
      },
    },
    language: {
      title: 'Language',
      subtitle: 'Choose the TUI language',
      current: 'Current',
      options: {
        auto: 'Auto (system)',
        zh: '中文',
        en: 'English',
      },
      saved: (label: string): string => `Language set to ${label}`,
      hint: 'Up/Down to choose, Enter to save, Esc to cancel',
    },
    breadcrumbs: {
      forms: {
        addSkill: 'Add Skill',
        addAgent: 'Add Agent',
        addProject: 'Add Project',
        importProject: 'Import',
        importAgent: 'Import',
        importContextSkills: 'Import',
        categorizeSkills: 'Categorize',
        updateSelected: 'Update',
        updateAllGit: 'Update',
      },
      syncSteps: {
        'select-op': '',
        'select-skills': 'Select Skills',
        'select-unsync-scope': 'Select Scope',
        'select-targets': 'Select Targets',
        'select-unsync-project-mode': 'Select Unsync Mode',
        'select-agent-types': 'Select Agent Types',
        'select-mode': 'Select Mode',
        confirm: 'Confirm',
        executing: 'Executing',
        results: 'Results',
      },
      importSteps: {
        'select-source-type': '',
        'select-source': 'Select Source',
        'select-skills': 'Select Skills',
        confirm: 'Confirm',
        executing: 'Executing',
        results: 'Results',
      },
      confirmTitle: (title: string): string => `Confirm ${title}`,
      search: 'Search',
      commands: 'Commands',
      help: 'Help',
      detail: 'Detail',
    },
    tables: {
      skillLibrary: 'Skill Library',
      agents: 'Agents',
      projects: 'Projects',
      id: 'ID',
      name: 'Name',
      path: 'Path',
      skillsShort: 'Skls',
      projectShort: 'Proj',
      added: 'Added',
      skills: 'Skills',
    },
    skillScreen: {
      library: 'Library: ',
      skillsTotal: ' skills total',
      syncedToAgents: ' synced to agents',
      inProjects: ' in projects',
      lastUpdate: 'Last update: ',
      browse: 'Browse: ',
      actions: 'Actions: ',
      actionLabels: {
        updateSelected: 'update selected',
        updateAllGit: 'update all git',
        unsync: 'unsync',
        categorize: 'categorize',
        browseCategory: 'browse category',
      },
    },
    context: {
      agent: 'Agent',
      project: 'Project',
      noneSelected: 'None selected',
      skills: 'Skills',
      detail: 'detail',
      select: 'select',
      import: 'import',
      unsync: 'unsync',
      update: 'update',
      categorize: 'categorize',
      agentSkills: 'Agent Skills',
      projectSkills: 'Project Skills',
      loadingAgentSkills: 'Loading skills for this agent...',
      loadingProjectSkills: 'Loading skills for this project...',
      different: '[different]',
      imported: '[imported]',
      unimported: '[unimported]',
    },
    skillDetail: {
      selectSkill: 'Select a skill to view details.',
      dossier: 'Skill dossier',
      loading: 'Loading skill details...',
      source: 'Source',
      created: 'Created',
      updated: 'Updated',
      categories: 'Categories',
      syncedTo: 'Synced to:',
      notSynced: '  Not synced to any agent',
      projects: 'Projects:',
      notDistributed: '  Not distributed to any project',
      differentVersion: 'different version',
      synced: 'synced',
      preview: 'SKILL.md preview:',
      moreAbove: (count: number): string => `^ ${count} more above`,
      moreBelow: (count: number): string => `v ${count} more below`,
      moreLines: (count: number): string => `... ${count} more lines`,
      scrollHint: 'Up/Down:Scroll  PgUp/PgDn:Jump  Esc:Back',
    },
    addForm: {
      titles: {
        addSkill: 'Add Skill',
        addAgent: 'Add Agent',
        addProject: 'Add Project',
        add: 'Add',
      },
      fields: {
        gitUrl: 'Git URL',
        skillName: 'Skill Name',
        agentId: 'Agent ID',
        displayName: 'Display Name',
        skillsPath: 'Skills Path',
        dirName: 'Dir Name',
        projectId: 'Project ID',
        projectPath: 'Project Path',
      },
      placeholders: {
        skillName: '(optional, auto-detected)',
        skillsDirName: '(optional)',
      },
      displayNameField: 'Display name',
      skillsPathField: 'Skills path',
      projectPathField: 'Project path',
      fixErrors: (count: number): string =>
        `Please fix ${count} ${plural(count, 'error', 'errors')} before submitting.`,
      noSkillsSelected: 'No skills selected',
      multiSkillsFound: 'Multiple skills found in repository:',
      noSkillsFound: 'No skills found in repository',
      discoveredHint: 'Space:Toggle Enter:Confirm Esc:Cancel',
    },
    modal: {
      enterConfirm: '[Enter] Confirm',
      escCancel: '[Esc] Cancel',
      escClose: '[Esc] Close',
      completionTitle: 'Shell Completion Setup',
      completionIntro1: 'Run one of the following commands to enable tab',
      completionIntro2: 'auto-completion for your shell:',
      conflictTitle: 'Auto-Link Detection',
      conflictFound: (skillName: string): string =>
        `Found same-name skills in Agent directories for "${skillName}":`,
      sameContent: '(same content, auto-linked)',
      differentContent: '(different content)',
      navToggleConfirmSkip: 'Up/Down:Navigate Space:Toggle Enter:Confirm Esc:Skip All',
    },
    sync: {
      screenTitle: 'Sync Skills',
      unsyncProjectsTitle: 'Unsync from Projects',
      unsyncAgentsTitle: 'Unsync from Agents',
      steps: {
        selectOperation: 'Select Operation',
        selectSkills: 'Select Skills',
        selectScope: 'Select Scope',
        selectTargets: 'Select Targets',
        selectUnsyncMode: 'Select Unsync Mode',
        selectAgentTypes: 'Select Agent Types',
        selectMode: 'Select Mode',
        confirm: 'Confirm',
        executing: 'Executing',
        results: 'Results',
      },
      chooseOperation: 'Choose operation:',
      options: {
        syncAgents: 'Sync to Agents',
        syncProjects: 'Sync to Projects',
        unsync: 'Unsync',
        agents: 'Agents',
        projects: 'Projects',
        allAgentTypes: 'All agent types',
        specificAgentTypes: 'Specific agent types',
        copy: 'Copy - Independent copy, stable and reliable',
        symlink: 'Symlink - Link to source, updates automatically',
      },
      selectSkills: 'Select skills',
      noSkills: 'No skills installed. Use the Skills tab to add skills.',
      selectUnsyncScope: 'Select unsync scope',
      selectAgents: 'Select agents',
      selectProjects: 'Select projects',
      selectProjectsUnsync: 'Select projects to unsync from',
      selectAgentsUnsync: 'Select agents to unsync from',
      loadingRelationships: 'Loading sync relationships...',
      noTargets: 'No matching targets found for the selected skills.',
      targetsSelected: (count: number): string =>
        `${count} target${count === 1 ? '' : '(s)'} selected`,
      chooseProjectUnsync: 'Choose how to unsync from projects',
      selectAgentTypesUnsync: 'Select agent types to unsync from selected projects',
      selectAgentTypes: 'Select agent types',
      noAgentTypes: 'No agent types are available for the selected projects.',
      modeTitle: 'Sync mode',
      confirmUnsync: 'Confirm Unsync',
      confirmSync: 'Confirm Sync',
      summarySync: (skills: number, targets: number, mode: string): string =>
        `Sync ${skills} skill(s) to ${targets} target(s) using ${mode} mode.`,
      summaryUnsyncAgents: (skills: number, targets: number): string =>
        `Unsync ${skills} skill(s) from ${targets} agent target(s).`,
      summaryUnsyncProjectsSpecific: (
        skills: number,
        projects: number,
        agentTypes: number
      ): string =>
        `Unsync ${skills} skill(s) from ${projects} project(s) for ${agentTypes} selected agent type(s).`,
      summaryUnsyncProjectsAll: (skills: number, projects: number): string =>
        `Unsync ${skills} skill(s) from ${projects} project(s) across all discovered agent types.`,
      skills: 'Skills',
      targets: 'Targets',
      agentTypes: 'Agent types',
      overall: 'Overall',
      completeSync: 'Sync complete',
      completeUnsync: 'Unsync complete',
      succeeded: 'succeeded',
      failed: 'failed',
      notSyncedAgent: 'Not synced to this agent',
      notSyncedProject: 'Not synced to this project',
      notSyncedAgentType: 'Not synced for this agent type',
      noAgentTypesSelected: 'No agent types selected',
      noAgentsConfigured: 'No agents configured',
      noProjectsConfigured: 'No projects configured',
      noSyncedAgentsFound: 'No synced agents found',
      noSyncedProjectsFound: 'No synced projects found',
      noSyncRelationships: 'No sync relationships found for the selected skills',
      nothingToDo: 'Nothing to do',
      toastOperation: (count: number, label: string, skipped: number): string =>
        `${count} ${label}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      toastFailure: (failed: number, success: number, label: string, skipped: number): string =>
        `${failed} failed, ${success} ${label}${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      synced: 'synced',
      unsynced: 'unsynced',
      progressUnsync: (skillName: string, target: string): string =>
        `unsync ${skillName} from ${target}`,
    },
    importFlow: {
      screenTitle: 'Import Skills',
      steps: {
        selectSourceType: 'Select Source Type',
        selectSource: 'Select Source',
        selectSkills: 'Select Skills',
        confirm: 'Confirm',
        executing: 'Executing',
        results: 'Results',
      },
      chooseSource: 'Choose source:',
      importFromProject: 'Import from Project',
      importFromAgent: 'Import from Agent',
      selectProject: 'Select project',
      selectAgent: 'Select agent',
      noConfigured: (sourceType: string): string => `No ${sourceType}s configured`,
      confirmImport: 'Confirm Import',
      confirmSentence: (count: number, label: string, sourceId: string | null): string =>
        `Import ${count} skill(s) from ${label} "${sourceId}".`,
      importingSkills: 'Importing skills...',
      importComplete: 'Import complete',
      resultSummary: (success: number, fail: number): string =>
        `${success} succeeded, ${fail} failed.`,
      importProgress: (name: string): string => `Importing ${name}...`,
      selectSkillsToImport: 'Select skills to import',
      hint: 'Space: toggle | Up/Down: navigate | Enter: confirm',
    },
    importOverlay: {
      selectA: (kind: string): string => `Select a ${kind}:`,
      selectSkills: 'Select skills to import:',
      navHint: 'Up/Down:Navigate Enter:Select Esc:Cancel',
      importing: 'Importing...',
    },
    contextImport: {
      title: 'Import Selected Context Skills',
      summary: (requested: number, importable: number): string =>
        `${requested} requested | ${importable} importable`,
      noSelected: 'No context skills selected.',
      executing: 'Importing selected context skills...',
      resultSummary: (imported: number, skipped: number, errors: number): string =>
        `${imported} imported | ${skipped} skipped | ${errors} errors`,
    },
    categoryForm: {
      title: 'Categorize Skills',
      targetSummary: (count: number): string => `${count} target${count === 1 ? '' : 's'}`,
      availableCategories: 'Available categories',
      selectHow: 'Select how to change categories:',
      modeOptions: {
        set: ['Set categories', 'Replace categories with the entered list'],
        add: ['Add categories', 'Append entered categories to existing ones'],
        remove: ['Remove categories', 'Remove entered categories from matching skills'],
        clear: ['Clear categories', 'Remove all categories from selected skills'],
      },
      selectExistingOrNew: 'select existing or add new',
      showingTarget: 'Showing categories currently used by the selected skill(s).',
      showingLibrary: 'Showing categories from the full skill library.',
      noRemove: 'No removable categories on the selected skill(s).',
      noExisting: 'No existing categories yet.',
      noRemoveAvailable: 'No removable categories are available; press n to type one.',
      noExistingAvailable: 'No existing categories yet; press n to type a new one.',
      selectOrType: 'Select an existing category or press n to type one.',
      newCategories: 'New categories',
      commaSeparated: 'comma separated',
      typeNew: 'Press n to type new categories',
      editHint: 'Up/Down:Move Space:Select n:New Enter:Continue Esc:Cancel',
      confirmChanges: 'Confirm changes',
      mode: 'Mode',
      categories: 'Categories',
      applyHint: 'Enter:Apply Esc:Cancel',
      applying: 'Applying category changes...',
      errors: 'errors',
      moreResults: (count: number): string => `... ${count} more result(s)`,
      updatedBadge: '[updated]',
      errorBadge: '[error]  ',
      unknownError: 'Unknown error',
    },
    updateForm: {
      titleAll: 'Update All Git Skills',
      titleSelected: 'Update Selected Skills',
      missing: 'Missing from registry',
      willUpdate: 'Will update and re-sync',
      skippedProject: 'Skipped: project-backed',
      skippedNotGit: 'Skipped: not git-backed',
      requestedSummary: (requested: number, updatable: number, skipped: number): string =>
        `${requested} requested | ${updatable} updatable${skipped > 0 ? ` | ${skipped} skipped` : ''}`,
      preview: 'Preview targets before running the update:',
      moreTargets: (count: number): string => `... ${count} more target(s)`,
      startHint: 'Enter:Start update Esc:Cancel',
      noGit: 'No git-backed skills to update. Enter or Esc to close.',
      executing: 'Updating git-backed skills and re-syncing managed copies...',
      preparing: 'Preparing update tasks...',
      progressBoth: (earlier: number, later: number): string =>
        `... ${earlier} earlier | ${later} more task(s)`,
      progressEarlier: (earlier: number): string => `... ${earlier} earlier task(s)`,
      progressLater: (later: number): string => `... ${later} more task(s)`,
      retryHint: 'R:Retry failed Enter:Close Esc:Close',
      badges: {
        update: '[update]',
        skip: '[skip]  ',
        updated: '[updated]',
        error: '[error]  ',
        skipped: '[skipped]',
      },
      toastUpdated: (updated: number, skipped: number): string =>
        `${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      toastFailed: (failed: number, updated: number, skipped: number): string =>
        `${failed} failed, ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ''}`,
      skillNotFound: 'Skill not found',
      notGitBacked: 'Not git-backed',
      noUpdateResult: 'No update result returned',
      updatingProgress: (skillName: string): string => `Updating ${skillName}`,
      updatedProgress: (skillName: string): string => `${skillName} updated`,
      skippedProgress: (skillName: string): string => `${skillName} skipped`,
    },
  },
  zh: {
    tabs: {
      skills: 'Skill',
      agents: 'Agent',
      projects: '项目',
      sync: '同步',
      import: '导入',
    } satisfies Record<TuiTabId, string>,
    shortTabs: {
      skills: 'S',
      agents: 'A',
      projects: '项',
      sync: '同',
      import: '导',
    } satisfies Record<TuiTabId, string>,
    subtitle: 'Skill 工作台',
    breadcrumb: {
      context: '上下文',
    },
    common: {
      all: '全部',
      uncategorized: '未分类',
      imported: '已导入',
      unimported: '未导入',
      none: '（无）',
      clearAll: '（清空全部）',
      never: '从未',
      unknown: '未知',
      local: '本地',
      project: '项目',
      git: 'git',
      close: '关闭',
      cancel: '取消',
      confirm: '确认',
      back: '返回',
      skip: '跳过',
      link: '关联',
      success: '成功',
      error: '错误',
      skipped: '已跳过',
      updated: '已更新',
      update: '更新',
      category: '分类',
      browse: '浏览',
      focus: '焦点',
      selected: '已选',
      actions: '操作',
      pressEscToClose: '按 Esc 关闭',
      enterCloseEscClose: 'Enter:关闭 Esc:关闭',
      enterConfirmEscBack: '[Enter] 确认  [Esc] 返回',
      enterConfirmEscCancel: '[Enter] 确认  [Esc] 取消',
      upDownChooseEnterContinue: '↑/↓ 选择，Enter 继续',
      upDownNavigateSpaceToggleEnterContinue: '↑/↓ 移动，Space 选择，Enter 继续',
      upDownSelectEnterContinue: '↑/↓ 选择，Enter 继续',
      spaceToggleEnterConfirmEscCancel: 'Space:选择 Enter:确认 Esc:取消',
      tabNextEnterSubmitEscCancel: 'Tab:下一项 Enter:提交 Esc:取消',
      pleaseWait: '请稍等...',
      processing: '处理中...',
      operationCompleted: '操作已完成。',
      noCommandsFound: '没有找到命令',
      newFlow: '新流程',
      newImport: '重新导入',
      importedLocked: '[已导入]',
      alreadyImportedSuffix: '（已导入）',
      ok: '成功',
      fail: '失败',
    },
    empty: {
      loadingSkills: '正在加载 Skill...',
      loadingAgents: '正在加载 Agent...',
      loadingProjects: '正在加载项目...',
      skills: '还没有 Skill。按 `a` 添加一个。',
      agents: '还没有注册 Agent。按 `a` 添加自定义 Agent。',
      projects: '还没有注册项目。按 `a` 添加项目。',
      contextSkills: '没有可用的上下文 Skill。',
      noSkillsFilter: '没有 Skill 符合当前筛选。',
    },
    validation: {
      gitUrlRequired: 'Git URL 不能为空',
      validUrl: '请输入有效 URL（https://...）',
      nameRequired: '名称不能为空',
      noSpaces: '不能包含空格',
      alphanumericHyphens: '只能包含字母、数字和连字符',
      idRequired: 'ID 不能为空',
      identifier: '只能包含字母、数字、连字符和下划线',
      required: (fieldName: string): string => `${fieldName}不能为空`,
      builtInAgentId: '不能使用内置 Agent ID',
    },
    app: {
      compactWarning: '⚠ 当前终端过窄；加宽到 80 列以上可查看完整详情',
      unsavedDiscard: '有未保存修改 -- 放弃？[y/N]',
    },
    status: {
      labels: {
        delete: '删除',
        add: '添加',
        import: '导入',
        sync: '同步',
        projectSync: '项目同步',
        update: '更新',
        updateAll: '全部更新',
        unsync: '取消同步',
        categorize: '分类',
        category: '分类',
        remove: '移除',
        open: '打开',
        toggle: '切换',
        confirm: '确认',
        back: '返回',
        detail: '详情',
        browse: '浏览',
        search: '搜索',
        help: '帮助',
        quit: '退出',
      },
      countSummary: (
        mode: 'full' | 'medium' | 'compact' | 'micro',
        skills: number,
        agents: number,
        projects: number,
        selected: number
      ): string => {
        const selectedSuffix =
          selected > 0
            ? mode === 'micro'
              ? ` / ${selected}`
              : mode === 'full'
                ? ` / 已选 ${selected}`
                : ` / 选 ${selected}`
            : '';

        switch (mode) {
          case 'full':
            return `库 ${skills} Skill / ${agents} Agent / ${projects} 项目${selectedSuffix}`;
          case 'medium':
            return `库 ${skills} Sk / ${agents} Ag / ${projects} 项${selectedSuffix}`;
          case 'compact':
            return `${skills}Sk / ${agents}Ag / ${projects}项${selectedSuffix}`;
          case 'micro':
            return `${skills}/${agents}/${projects}${selectedSuffix}`;
        }
      },
      library: '库 ',
      skillsFull: ' Skill',
      skillsCompact: ' Sk',
      agentsFull: ' Agent',
      agentsCompact: ' Ag',
      projectsFull: ' 项目',
      projectsMedium: ' 项',
      projectsCompact: ' 项',
      selectedFull: ' 已选',
      selectedCompact: ' 选',
      deletedUndo: (name: string, seconds: number): string =>
        `已删除 '${name}' - 撤销（${seconds}s）`,
      restored: (name: string): string => `已恢复 '${name}'`,
    },
    mutations: {
      deleteSkillsTitle: (count: number): string => `删除 ${count} 个 Skill`,
      deleteSkillsMessage: (agentSyncs: number, projectSyncs: number): string =>
        `将移除 ${agentSyncs} 个用户级同步和 ${projectSyncs} 个项目同步。磁盘上的文件也会被删除。`,
      deletedSkill: (name: string): string => `已删除 '${name}'`,
      deletedSkills: (count: number): string => `已删除 ${count} 个 Skill`,
      removeAgentTitle: (name: string): string => `移除 Agent "${name}"`,
      removeAgentMessage: '磁盘文件会保留，AgentForge 会忘记与此 Agent 相关的同步记录。',
      removedAgent: (name: string): string => `已移除 Agent '${name}'`,
      removeProjectTitle: (id: string): string => `移除项目 "${id}"`,
      removeProjectMessage: '磁盘文件会保留，AgentForge 会忘记此项目及其记录的同步关系。',
      removedProject: (id: string): string => `已移除项目 '${id}'`,
      skillInstalled: (name: string): string => `Skill '${name}' 已安装`,
    },
    help: {
      title: '键盘快捷键',
      subtitle: 'AgentForge TUI 的完整工作台操作。',
      navigation: '导航',
      selection: '选择',
      actions: '操作',
      closeHint: '按 Esc 或 ? 关闭',
      rows: [
        ' ←/→ 上一个/下一个标签',
        ' 1-5 跳转到标签',
        ' ↑/↓ 移动焦点',
        ' Home/End 跳到开头/末尾',
        ' Space 切换选择',
        ' Enter 打开列表 / 详情 / 执行',
        ' Esc 从详情或上下文列表返回',
        ' / 打开搜索',
        ' ? 切换此帮助',
        ' Ctrl+P 切换语言',
        ' i 导入当前上下文 Skill',
        ' c 给选中的 Skill 分类',
        ' [ / ] 上一个/下一个分类或上下文筛选',
        ' u 更新选中的 Skill',
        ' U 更新所有 git 来源 Skill',
        ' x 取消同步选中的 Skill',
        ' R 刷新全部数据',
        ' q 退出',
      ],
    },
    search: {
      title: '搜索',
      query: '查询',
      hint: '在当前标签中输入搜索内容',
      noResults: (query: string): string => `没有找到 "${query}"`,
      summary: (count: number, query: string, overflow: string): string =>
        `"${query}" 有 ${count} 个结果${overflow}`,
    },
    commands: {
      title: '命令面板',
      command: '命令',
      entries: {
        changeLanguage: '切换语言',
      },
    },
    language: {
      title: '语言',
      subtitle: '选择 TUI 显示语言',
      current: '当前',
      options: {
        auto: '自动（跟随系统）',
        zh: '中文',
        en: 'English',
      },
      saved: (label: string): string => `语言已切换为 ${label}`,
      hint: '↑/↓ 选择，Enter 保存，Esc 取消',
    },
    breadcrumbs: {
      forms: {
        addSkill: '添加 Skill',
        addAgent: '添加 Agent',
        addProject: '添加项目',
        importProject: '导入',
        importAgent: '导入',
        importContextSkills: '导入',
        categorizeSkills: '分类',
        updateSelected: '更新',
        updateAllGit: '更新',
      },
      syncSteps: {
        'select-op': '',
        'select-skills': '选择 Skill',
        'select-unsync-scope': '选择范围',
        'select-targets': '选择目标',
        'select-unsync-project-mode': '选择取消同步模式',
        'select-agent-types': '选择 Agent 类型',
        'select-mode': '选择模式',
        confirm: '确认',
        executing: '执行中',
        results: '结果',
      },
      importSteps: {
        'select-source-type': '',
        'select-source': '选择来源',
        'select-skills': '选择 Skill',
        confirm: '确认',
        executing: '执行中',
        results: '结果',
      },
      confirmTitle: (title: string): string => `确认 ${title}`,
      search: '搜索',
      commands: '命令',
      help: '帮助',
      detail: '详情',
    },
    tables: {
      skillLibrary: 'Skill 库',
      agents: 'Agent',
      projects: '项目',
      id: 'ID',
      name: '名称',
      path: '路径',
      skillsShort: 'Skill',
      projectShort: '项目',
      added: '添加时间',
      skills: 'Skill',
    },
    skillScreen: {
      library: '库：',
      skillsTotal: ' 个 Skill',
      syncedToAgents: ' 已同步到 Agent',
      inProjects: ' 在项目中',
      lastUpdate: '最近更新：',
      browse: '浏览：',
      actions: '操作：',
      actionLabels: {
        updateSelected: '更新选中',
        updateAllGit: '更新全部 git',
        unsync: '取消同步',
        categorize: '分类',
        browseCategory: '浏览分类',
      },
    },
    context: {
      agent: 'Agent',
      project: '项目',
      noneSelected: '未选择',
      skills: 'Skill',
      detail: '详情',
      select: '选择',
      import: '导入',
      unsync: '取消同步',
      update: '更新',
      categorize: '分类',
      agentSkills: 'Agent Skill',
      projectSkills: '项目 Skill',
      loadingAgentSkills: '正在加载此 Agent 的 Skill...',
      loadingProjectSkills: '正在加载此项目的 Skill...',
      different: '[不同版本]',
      imported: '[已导入]',
      unimported: '[未导入]',
    },
    skillDetail: {
      selectSkill: '选择一个 Skill 查看详情。',
      dossier: 'Skill 档案',
      loading: '正在加载 Skill 详情...',
      source: '来源',
      created: '创建',
      updated: '更新',
      categories: '分类',
      syncedTo: '已同步到：',
      notSynced: '  尚未同步到任何 Agent',
      projects: '项目：',
      notDistributed: '  尚未分发到任何项目',
      differentVersion: '不同版本',
      synced: '已同步',
      preview: 'SKILL.md 预览：',
      moreAbove: (count: number): string => `^ 上方还有 ${count} 行`,
      moreBelow: (count: number): string => `v 下方还有 ${count} 行`,
      moreLines: (count: number): string => `... 还有 ${count} 行`,
      scrollHint: '↑/↓:滚动  PgUp/PgDn:跳转  Esc:返回',
    },
    addForm: {
      titles: {
        addSkill: '添加 Skill',
        addAgent: '添加 Agent',
        addProject: '添加项目',
        add: '添加',
      },
      fields: {
        gitUrl: 'Git URL',
        skillName: 'Skill 名称',
        agentId: 'Agent ID',
        displayName: '显示名称',
        skillsPath: 'Skill 路径',
        dirName: '目录名',
        projectId: '项目 ID',
        projectPath: '项目路径',
      },
      placeholders: {
        skillName: '（可选，自动检测）',
        skillsDirName: '（可选）',
      },
      displayNameField: '显示名称',
      skillsPathField: 'Skill 路径',
      projectPathField: '项目路径',
      fixErrors: (count: number): string => `请先修正 ${count} 个错误再提交。`,
      noSkillsSelected: '没有选择 Skill',
      multiSkillsFound: '仓库中发现多个 Skill：',
      noSkillsFound: '仓库中没有找到 Skill',
      discoveredHint: 'Space:选择 Enter:确认 Esc:取消',
    },
    modal: {
      enterConfirm: '[Enter] 确认',
      escCancel: '[Esc] 取消',
      escClose: '[Esc] 关闭',
      completionTitle: 'Shell 自动补全设置',
      completionIntro1: '运行以下任一命令即可启用当前 shell 的',
      completionIntro2: 'Tab 自动补全：',
      conflictTitle: '自动关联检测',
      conflictFound: (skillName: string): string =>
        `在 Agent 目录中发现与 "${skillName}" 同名的 Skill：`,
      sameContent: '（内容相同，已自动关联）',
      differentContent: '（内容不同）',
      navToggleConfirmSkip: '↑/↓:移动 Space:切换 Enter:确认 Esc:全部跳过',
    },
    sync: {
      screenTitle: '同步 Skill',
      unsyncProjectsTitle: '取消项目同步',
      unsyncAgentsTitle: '取消 Agent 同步',
      steps: {
        selectOperation: '选择操作',
        selectSkills: '选择 Skill',
        selectScope: '选择范围',
        selectTargets: '选择目标',
        selectUnsyncMode: '选择取消同步模式',
        selectAgentTypes: '选择 Agent 类型',
        selectMode: '选择模式',
        confirm: '确认',
        executing: '执行中',
        results: '结果',
      },
      chooseOperation: '选择操作：',
      options: {
        syncAgents: '同步到 Agent',
        syncProjects: '同步到项目',
        unsync: '取消同步',
        agents: 'Agent',
        projects: '项目',
        allAgentTypes: '全部 Agent 类型',
        specificAgentTypes: '指定 Agent 类型',
        copy: '复制 - 独立副本，稳定可靠',
        symlink: '符号链接 - 链接到源目录，自动生效',
      },
      selectSkills: '选择 Skill',
      noSkills: '还没有 Skill。请先在 Skill 标签中添加 Skill。',
      selectUnsyncScope: '选择取消同步范围',
      selectAgents: '选择 Agent',
      selectProjects: '选择项目',
      selectProjectsUnsync: '选择要取消同步的项目',
      selectAgentsUnsync: '选择要取消同步的 Agent',
      loadingRelationships: '正在加载同步关系...',
      noTargets: '选中 Skill 没有匹配目标。',
      targetsSelected: (count: number): string => `已选 ${count} 个目标`,
      chooseProjectUnsync: '选择项目取消同步方式',
      selectAgentTypesUnsync: '选择要从所选项目取消同步的 Agent 类型',
      selectAgentTypes: '选择 Agent 类型',
      noAgentTypes: '所选项目没有可用的 Agent 类型。',
      modeTitle: '同步模式',
      confirmUnsync: '确认取消同步',
      confirmSync: '确认同步',
      summarySync: (skills: number, targets: number, mode: string): string =>
        `将 ${skills} 个 Skill 以 ${mode} 模式同步到 ${targets} 个目标。`,
      summaryUnsyncAgents: (skills: number, targets: number): string =>
        `从 ${targets} 个 Agent 目标取消同步 ${skills} 个 Skill。`,
      summaryUnsyncProjectsSpecific: (
        skills: number,
        projects: number,
        agentTypes: number
      ): string =>
        `从 ${projects} 个项目的 ${agentTypes} 个指定 Agent 类型取消同步 ${skills} 个 Skill。`,
      summaryUnsyncProjectsAll: (skills: number, projects: number): string =>
        `从 ${projects} 个项目中已发现的全部 Agent 类型取消同步 ${skills} 个 Skill。`,
      skills: 'Skill',
      targets: '目标',
      agentTypes: 'Agent 类型',
      overall: '整体',
      completeSync: '同步完成',
      completeUnsync: '取消同步完成',
      succeeded: '成功',
      failed: '失败',
      notSyncedAgent: '未同步到此 Agent',
      notSyncedProject: '未同步到此项目',
      notSyncedAgentType: '此 Agent 类型未同步',
      noAgentTypesSelected: '没有选择 Agent 类型',
      noAgentsConfigured: '没有配置 Agent',
      noProjectsConfigured: '没有配置项目',
      noSyncedAgentsFound: '没有找到已同步的 Agent',
      noSyncedProjectsFound: '没有找到已同步的项目',
      noSyncRelationships: '选中 Skill 没有同步关系',
      nothingToDo: '没有可执行操作',
      toastOperation: (count: number, label: string, skipped: number): string =>
        `${count} 个已${label}${skipped > 0 ? `，${skipped} 个已跳过` : ''}`,
      toastFailure: (failed: number, success: number, label: string, skipped: number): string =>
        `${failed} 个失败，${success} 个已${label}${skipped > 0 ? `，${skipped} 个已跳过` : ''}`,
      synced: '同步',
      unsynced: '取消同步',
      progressUnsync: (skillName: string, target: string): string =>
        `从 ${target} 取消同步 ${skillName}`,
    },
    importFlow: {
      screenTitle: '导入 Skill',
      steps: {
        selectSourceType: '选择来源类型',
        selectSource: '选择来源',
        selectSkills: '选择 Skill',
        confirm: '确认',
        executing: '执行中',
        results: '结果',
      },
      chooseSource: '选择来源：',
      importFromProject: '从项目导入',
      importFromAgent: '从 Agent 导入',
      selectProject: '选择项目',
      selectAgent: '选择 Agent',
      noConfigured: (sourceType: string): string => `没有配置${sourceType}`,
      confirmImport: '确认导入',
      confirmSentence: (count: number, label: string, sourceId: string | null): string =>
        `从${label} "${sourceId}" 导入 ${count} 个 Skill。`,
      importingSkills: '正在导入 Skill...',
      importComplete: '导入完成',
      resultSummary: (success: number, fail: number): string =>
        `${success} 个成功，${fail} 个失败。`,
      importProgress: (name: string): string => `正在导入 ${name}...`,
      selectSkillsToImport: '选择要导入的 Skill',
      hint: 'Space:选择 | ↑/↓:移动 | Enter:确认',
    },
    importOverlay: {
      selectA: (kind: string): string => `选择一个${kind}：`,
      selectSkills: '选择要导入的 Skill：',
      navHint: '↑/↓:移动 Enter:选择 Esc:取消',
      importing: '正在导入...',
    },
    contextImport: {
      title: '导入选中的上下文 Skill',
      summary: (requested: number, importable: number): string =>
        `${requested} 个请求 | ${importable} 个可导入`,
      noSelected: '没有选择上下文 Skill。',
      executing: '正在导入选中的上下文 Skill...',
      resultSummary: (imported: number, skipped: number, errors: number): string =>
        `${imported} 个已导入 | ${skipped} 个已跳过 | ${errors} 个错误`,
    },
    categoryForm: {
      title: '分类 Skill',
      targetSummary: (count: number): string => `${count} 个目标`,
      availableCategories: '可用分类',
      selectHow: '选择分类变更方式：',
      modeOptions: {
        set: ['设置分类', '用输入列表替换现有分类'],
        add: ['添加分类', '把输入分类追加到现有分类'],
        remove: ['移除分类', '从匹配 Skill 中移除输入分类'],
        clear: ['清空分类', '移除选中 Skill 的全部分类'],
      },
      selectExistingOrNew: '选择已有分类或添加新分类',
      showingTarget: '正在显示选中 Skill 当前使用的分类。',
      showingLibrary: '正在显示整个 Skill 库中的分类。',
      noRemove: '选中 Skill 上没有可移除分类。',
      noExisting: '还没有已有分类。',
      noRemoveAvailable: '没有可移除分类；按 n 手动输入。',
      noExistingAvailable: '还没有已有分类；按 n 输入新分类。',
      selectOrType: '请选择已有分类，或按 n 手动输入。',
      newCategories: '新分类',
      commaSeparated: '用逗号分隔',
      typeNew: '按 n 输入新分类',
      editHint: '↑/↓:移动 Space:选择 n:新建 Enter:继续 Esc:取消',
      confirmChanges: '确认变更',
      mode: '模式',
      categories: '分类',
      applyHint: 'Enter:应用 Esc:取消',
      applying: '正在应用分类变更...',
      errors: '错误',
      moreResults: (count: number): string => `... 还有 ${count} 个结果`,
      updatedBadge: '[已更新]',
      errorBadge: '[错误]  ',
      unknownError: '未知错误',
    },
    updateForm: {
      titleAll: '更新全部 Git Skill',
      titleSelected: '更新选中 Skill',
      missing: '注册表中不存在',
      willUpdate: '将更新并重新同步',
      skippedProject: '跳过：项目来源',
      skippedNotGit: '跳过：不是 git 来源',
      requestedSummary: (requested: number, updatable: number, skipped: number): string =>
        `${requested} 个请求 | ${updatable} 个可更新${skipped > 0 ? ` | ${skipped} 个跳过` : ''}`,
      preview: '运行更新前预览目标：',
      moreTargets: (count: number): string => `... 还有 ${count} 个目标`,
      startHint: 'Enter:开始更新 Esc:取消',
      noGit: '没有 git 来源 Skill 可更新。Enter 或 Esc 关闭。',
      executing: '正在更新 git 来源 Skill 并重新同步受管副本...',
      preparing: '正在准备更新任务...',
      progressBoth: (earlier: number, later: number): string =>
        `... 前面 ${earlier} 个 | 后面 ${later} 个任务`,
      progressEarlier: (earlier: number): string => `... 前面 ${earlier} 个任务`,
      progressLater: (later: number): string => `... 后面 ${later} 个任务`,
      retryHint: 'R:重试失败项 Enter:关闭 Esc:关闭',
      badges: {
        update: '[更新]',
        skip: '[跳过]  ',
        updated: '[已更新]',
        error: '[错误]  ',
        skipped: '[已跳过]',
      },
      toastUpdated: (updated: number, skipped: number): string =>
        `${updated} 个已更新${skipped > 0 ? `，${skipped} 个已跳过` : ''}`,
      toastFailed: (failed: number, updated: number, skipped: number): string =>
        `${failed} 个失败，${updated} 个已更新${skipped > 0 ? `，${skipped} 个已跳过` : ''}`,
      skillNotFound: 'Skill 不存在',
      notGitBacked: '不是 git 来源',
      noUpdateResult: '没有返回更新结果',
      updatingProgress: (skillName: string): string => `正在更新 ${skillName}`,
      updatedProgress: (skillName: string): string => `${skillName} 已更新`,
      skippedProgress: (skillName: string): string => `${skillName} 已跳过`,
    },
  },
} as const;

export function getTuiText(locale: TuiLocale | undefined | null): (typeof tuiText)['en'] {
  return tuiText[normalizeTuiLocale(locale)] as (typeof tuiText)['en'];
}

export function localizeSkillCategoryLabel(
  label: string,
  locale: TuiLocale | undefined | null
): string {
  const text = getTuiText(locale);
  if (label === 'All') return text.common.all;
  if (label === 'Uncategorized') return text.common.uncategorized;
  return label;
}
