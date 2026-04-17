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
import { CommandPalette } from './components/CommandPalette.js';
import { CategoryForm } from './components/CategoryForm.js';
import { CompletionModal } from './components/CompletionModal.js';
import { ConfirmModal } from './components/ConfirmModal.js';
import { ConflictPanel } from './components/ConflictPanel.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { ImportForm } from './components/ImportForm.js';
import { ProgressBarStack } from './components/ProgressBar.js';
import { SearchOverlay } from './components/SearchOverlay.js';
import { StatusBar } from './components/StatusBar.js';
import { TabBar } from './components/TabBar.js';
import { UpdateForm } from './components/UpdateForm.js';
import { useInputHandler } from './hooks/useInput.js';
import { useTerminalDimensions } from './hooks/useTerminalDimensions.js';
import type { WidthBand } from './hooks/useTerminalDimensions.js';
import { AgentsScreen } from './screens/AgentsScreen.js';
import { ImportScreen } from './screens/ImportScreen.js';
import { ProjectsScreen } from './screens/ProjectsScreen.js';
import { SkillsScreen } from './screens/SkillsScreen.js';
import { SyncScreen } from './screens/SyncScreen.js';
import type { AppStore } from './store/index.js';
import { deriveBreadcrumbs } from './utils/breadcrumbs.js';

interface AppProps {
  store: StoreApi<AppStore>;
  ctx: import('./store/dataSlice.js').ServiceContext;
}

export function App({ store, ctx }: AppProps): React.ReactElement {
  const activeTab = useStore(store, (s) => s.activeTab);
  const showSearch = useStore(store, (s) => s.showSearch);
  const showHelp = useStore(store, (s) => s.showHelp);
  const formState = useStore(store, (s) => s.formState);
  const confirmState = useStore(store, (s) => s.confirmState);
  const completionModalOpen = useStore(store, (s) => s.completionModalOpen);
  const conflictState = useStore(store, (s) => s.conflictState);
  const updateProgressItems = useStore(store, (s) => s.updateProgressItems);
  const showCommandPalette = useStore(store, (s) => s.showCommandPalette);
  const dirtyConfirmActive = useStore(store, (s) => s.dirtyConfirmActive);
  const setWidthBand = useStore(store, (s) => s.setWidthBand);
  useInputHandler(store);

  const dimensions = useTerminalDimensions();

  // Sync width band to Zustand store so all downstream hooks can read state.widthBand
  useEffect(() => {
    setWidthBand(dimensions.band);
  }, [dimensions.band, setWidthBand]);

  const band = dimensions.band as WidthBand;
  const columns = dimensions.columns;
  const isCompact = band === 'compact';
  const updateFormOpen = formState?.formType === 'updateSelected' || formState?.formType === 'updateAllGit';

  // Derive breadcrumb segments from store state
  const breadcrumbState = useStore(store, useShallow((s) => ({
    activeTab: s.activeTab,
    showSearch: s.showSearch,
    showHelp: s.showHelp,
    showCommandPalette: s.showCommandPalette,
    confirmState: s.confirmState,
    formState: s.formState,
    syncFormStep: s.syncFormStep,
    importTabStep: s.importTabStep,
    detailOverlayVisible: s.detailOverlayVisible,
    widthBand: s.widthBand,
  })));
  const breadcrumbSegments = deriveBreadcrumbs(breadcrumbState);

  return (
    <Box flexDirection="column" height="100%">
      <TabBar store={store} band={band} columns={columns} />
      <BreadcrumbBar segments={breadcrumbSegments} />
      {isCompact && (
        <Text color="yellow">{"\u26A0"} Compact terminal layout active -- widen to 80+ columns for the full detail view</Text>
      )}
      <Box flexGrow={1}>
        <>
          {activeTab === 'skills' && <SkillsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'agents' && <AgentsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'projects' && <ProjectsScreen store={store} band={band} columns={columns} />}
          {activeTab === 'sync' && <SyncScreen store={store} />}
          {activeTab === 'import' && <ImportScreen store={store} ctx={ctx} />}
        </>
      </Box>
      {dirtyConfirmActive && (
        <Text color="yellow">Unsaved changes -- Discard? [y/N]</Text>
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
      {formState && formState.formType.startsWith('import') && <ImportForm store={store} />}
      {updateFormOpen && <UpdateForm store={store} />}
      {conflictState && <ConflictPanel store={store} />}
      {confirmState && <ConfirmModal store={store} />}
      {completionModalOpen && <CompletionModal store={store} />}
    </Box>
  );
}
