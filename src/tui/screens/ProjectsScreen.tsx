/**
 * Projects tab content -- wraps ProjectTable with padding and detail loading.
 */

import React, { useEffect } from 'react';
import { Box } from 'ink';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { AppStore } from '../store/index.js';
import { ProjectTable } from '../components/ProjectTable.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';

interface ProjectsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

export function ProjectsScreen({ store, band, columns }: ProjectsScreenProps): React.ReactElement | null {
  const focusedProjectIndex = useStore(store, s => s.focusedProjectIndex);
  const projects = useStore(store, s => s.projects);

  if (band === 'compact') {
    return null;
  }

  // Load project detail when focused project changes
  useEffect(() => {
    const focusedProject = projects[focusedProjectIndex];
    if (focusedProject) {
      const detail = store.getState().projectDetails[focusedProject.id];
      if (!detail) {
        store.getState().loadProjectDetail(focusedProject.id);
      }
    }
  }, [focusedProjectIndex, projects, store]);

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      <ProjectTable store={store} columns={columns} />
    </Box>
  );
}
