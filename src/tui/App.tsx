/**
 * Root TUI component -- renders TabBar, BreadcrumbBar, screen router, StatusBar, and overlays
 */

import { Box, Text } from 'ink';
import { useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import { AddForm } from './components/AddForm.js';
import { BreadcrumbBar } from './components/BreadcrumbBar.js';
import { CategoryForm } from './components/CategoryForm.js';
import { CommandPalette } from './components/CommandPalette.js';
import { CompletionModal } from './components/CompletionModal.js';
import { ConfirmModal } from './components/ConfirmModal.js';
import { ConflictPanel } from './components/ConflictPanel.js';
import { ContextImportForm } from './components/ContextImportForm.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ImportForm } from './components/ImportForm.js';
import { ProgressBarStack } from './components/ProgressBar.js';
import { SearchOverlay } from './components/SearchOverlay.js';
import { StatusBar } from './components/StatusBar.js';
import { TabBar } from './components/TabBar.js';
import { UpdateForm } from './components/UpdateForm.js';
import { useInputHandler } from './hooks/useInput.js';
import type { WidthBand } from './hooks/useTerminalDimensions.js';
import { useTerminalDimensions } from './hooks/useTerminalDimensions.js';
import { AgentsScreen } from './screens/AgentsScreen.js';
import { ImportScreen } from './screens/ImportScreen.js';
import { ProjectsScreen } from './screens/ProjectsScreen.js';
import { SkillsScreen } from './screens/SkillsScreen.js';
import { SyncScreen } from './screens/SyncScreen.js';
import type { AppStore } from './store/index.js';
import { inkColors } from './theme.js';
import { deriveBreadcrumbs } from './utils/breadcrumbs.js';

interface AppProps {
  store: StoreApi<AppStore>;
}

export function App({ store }: AppProps): React.ReactElement {
  const activeTab = useStore(store, (s) => s.shellState.activeTab);
  const showSearch = useStore(store, (s) => s.shellState.showSearch);
  const showHelp = useStore(store, (s) => s.shellState.showHelp);
  const formState = useStore(store, (s) => s.shellState.formState);
  const confirmState = useStore(store, (s) => s.shellState.confirmState);
  const completionModalOpen = useStore(store, (s) => s.shellState.completionModalOpen);
  const conflictState = useStore(store, (s) => s.shellState.conflictState);
  const updateProgressItems = useStore(store, (s) => s.shellState.updateProgressItems);
  const showCommandPalette = useStore(store, (s) => s.shellState.showCommandPalette);
  const dirtyConfirmActive = useStore(store, (s) => s.shellState.dirtyConfirmActive);
  const setWidthBand = useStore(store, (s) => s.setWidthBand);
  useInputHandler(store);

  const dimensions = useTerminalDimensions();

  useEffect(() => {
    setWidthBand(dimensions.band);
  }, [dimensions.band, setWidthBand]);

  const band = dimensions.band as WidthBand;
  const columns = dimensions.columns;
  const isCompact = band === 'compact';
  const updateFormOpen =
    formState?.formType === 'updateSelected' || formState?.formType === 'updateAllGit';

  const breadcrumbState = useStore(store, useShallow((s) => ({
    activeTab: s.shellState.activeTab,
    showSearch: s.shellState.showSearch,
    showHelp: s.shellState.showHelp,
    showCommandPalette: s.shellState.showCommandPalette,
    confirmState: s.shellState.confirmState,
    formState: s.shellState.formState,
    syncFormStep: s.syncWorkflowState.step,
    importTabStep: s.importWorkflowState.step,
    detailOverlayVisible: s.shellState.detailOverlayVisible,
    widthBand: s.shellState.widthBand,
  })));
  const breadcrumbSegments = deriveBreadcrumbs(breadcrumbState);

  return (
    <Box flexDirection="column" height="100%">
      <TabBar store={store} band={band} columns={columns} />
      <BreadcrumbBar segments={breadcrumbSegments} />
      {isCompact && (
        <Text color={inkColors.warning}>
          {"\u26A0"} Compact terminal layout active -- widen to 80+ columns for the full detail view
        </Text>
      )}
      <Box flexGrow={1}>
        <>
          {activeTab === 'skills' && <SkillsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'agents' && <AgentsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'projects' && <ProjectsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'sync' && <SyncScreen store={store} />}
          {activeTab === 'import' && <ImportScreen store={store} />}
        </>
      </Box>
      {dirtyConfirmActive && (
        <Text color={inkColors.warning}>Unsaved changes -- Discard? [y/N]</Text>
      )}
      <StatusBar store={store} band={band} columns={columns} />
      {updateProgressItems.length > 0 && activeTab === 'skills' && !updateFormOpen && (
        <Box paddingX={1}>
          <ProgressBarStack items={updateProgressItems} />
        </Box>
      )}
      {showCommandPalette && <CommandPalette store={store} />}
      {showSearch && <SearchOverlay store={store} />}
      {showHelp && <HelpOverlay store={store} />}
      {formState && formState.formType.startsWith('add') && <AddForm store={store} />}
      {formState?.formType === 'categorizeSkills' && <CategoryForm store={store} />}
      {formState?.formType === 'importContextSkills' && <ContextImportForm store={store} />}
      {(formState?.formType === 'importProject' || formState?.formType === 'importAgent') && (
        <ImportForm store={store} />
      )}
      {updateFormOpen && <UpdateForm store={store} />}
      {conflictState && <ConflictPanel store={store} />}
      {confirmState && <ConfirmModal store={store} />}
      {completionModalOpen && <CompletionModal store={store} />}
    </Box>
  );
}
