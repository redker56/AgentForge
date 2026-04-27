/**
 * Projects tab content with a master list and contextual skill workbench.
 */

import { Box, Text } from 'ink';
import React, { useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import { ContextSkillList } from '../components/ContextSkillList.js';
import { ProjectTable } from '../components/ProjectTable.js';
import { SkillDetail } from '../components/SkillDetail.js';
import { getContextSkillFilterCounts, getVisibleContextSkillRows } from '../contextTypes.js';
import type { WidthBand } from '../hooks/useTerminalDimensions.js';
import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';

interface ProjectsScreenProps {
  store: StoreApi<AppStore>;
  band: WidthBand;
  columns: number;
}

export function ProjectsScreen({
  store,
  band,
  columns,
}: ProjectsScreenProps): React.ReactElement | null {
  const focusedProjectIndex = useStore(store, (s) => s.projectsBrowserState.focusedIndex);
  const projects = useStore(store, (s) => s.projects);
  const projectDetails = useStore(store, (s) => s.projectDetails);
  const projectViewMode = useStore(store, (s) => s.projectsBrowserState.viewMode) ?? 'master';
  const focusedProjectSkillIndex =
    useStore(store, (s) => s.projectsBrowserState.focusedSkillIndex) ?? 0;
  const selectedProjectSkillRowIds =
    useStore(store, (s) => s.projectsBrowserState.selectedSkillRowIds) ?? new Set<string>();
  const activeProjectSkillFilter =
    useStore(store, (s) => s.projectsBrowserState.activeSkillFilter) ?? 'all';
  const detailOverlayVisible = useStore(store, (s) => s.shellState.detailOverlayVisible);
  const detailSkillName = useStore(store, (s) => s.shellState.detailSkillName);

  const focusedProject = projects[focusedProjectIndex];
  const detail = focusedProject ? projectDetails[focusedProject.id] : undefined;
  const sections = detail?.sections ?? [];
  const visibleRows = getVisibleContextSkillRows(sections, activeProjectSkillFilter);
  const filterCounts = getContextSkillFilterCounts(sections.flatMap((section) => section.rows));

  useEffect(() => {
    if (focusedProject && !detail) {
      void store.getState().loadProjectDetail(focusedProject.id);
    }
  }, [detail, focusedProject, store]);

  useEffect(() => {
    store.getState().clearProjectSkillSelection();
    store.getState().setFocusedProjectSkillIndex(0);
  }, [focusedProject?.id, store]);

  const contextPane = (
    <Box flexDirection="column" flexGrow={1} minHeight={0}>
      <Text color={inkColors.muted}>
        Project:{' '}
        <Text color={inkColors.accent} bold>
          {focusedProject?.id ?? 'None selected'}
        </Text>
        <Text color={inkColors.muted}> / Focus: </Text>
        <Text color={projectViewMode === 'skills' ? inkColors.accent : inkColors.secondary}>
          {projectViewMode === 'skills' ? 'Skills' : 'Project'}
        </Text>
      </Text>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Browse: </Text>
        {filterCounts.map((entry, index) => {
          const isActive = entry.key === activeProjectSkillFilter;
          return (
            <React.Fragment key={entry.key}>
              {index > 0 && <Text color={inkColors.muted}> | </Text>}
              <Text
                color={isActive ? inkColors.focusText : inkColors.secondary}
                backgroundColor={isActive ? inkColors.paper : undefined}
                bold={isActive}
              >
                {isActive ? ` ${entry.label}:${entry.count} ` : `${entry.label}:${entry.count}`}
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
      <Box flexWrap="wrap">
        <Text color={inkColors.muted}>Actions: </Text>
        <Text color={inkColors.accent}>Enter</Text>
        <Text color={inkColors.secondary}> detail</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>Space</Text>
        <Text color={inkColors.secondary}> select</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>i</Text>
        <Text color={inkColors.secondary}> import</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>x</Text>
        <Text color={inkColors.secondary}> unsync</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>u</Text>
        <Text color={inkColors.secondary}> update</Text>
        <Text color={inkColors.muted}> | </Text>
        <Text color={inkColors.accent}>c</Text>
        <Text color={inkColors.secondary}> categorize</Text>
      </Box>
      {detail ? (
        <ContextSkillList
          title="Project Skills"
          sections={sections}
          filter={activeProjectSkillFilter}
          focusedIndex={focusedProjectSkillIndex}
          selectedRowIds={selectedProjectSkillRowIds}
          columns={band === 'widescreen' ? Math.max(Math.floor(columns * 0.56), 40) : columns}
          emptyText="No context skills available."
        />
      ) : (
        <Text color={inkColors.muted}>Loading skills for this project...</Text>
      )}
      {projectViewMode === 'skills' && visibleRows.length === 0 && detail && (
        <Text color={inkColors.muted}>No skills match the current filter.</Text>
      )}
    </Box>
  );

  return (
    <Box flexDirection="column" height="100%" padding={1}>
      {band === 'widescreen' ? (
        <Box flexDirection="row" flexGrow={1} minHeight={0} overflow="hidden">
          <Box width="42%" flexDirection="column" minHeight={0}>
            <ProjectTable store={store} columns={Math.max(Math.floor(columns * 0.42), 30)} />
          </Box>
          <Box
            width="58%"
            flexDirection="column"
            borderStyle="single"
            borderLeft={true}
            borderRight={false}
            borderTop={false}
            borderBottom={false}
            borderColor={inkColors.border}
            minHeight={0}
            overflow="hidden"
            paddingLeft={1}
          >
            {contextPane}
          </Box>
        </Box>
      ) : projectViewMode === 'master' ? (
        <ProjectTable store={store} columns={columns} />
      ) : (
        contextPane
      )}

      {detailOverlayVisible && detailSkillName && (
        <Box flexDirection="row">
          <Box flexGrow={1} />
          <SkillDetail
            store={store}
            band="standard"
            columns={columns}
            skillName={detailSkillName}
          />
        </Box>
      )}
    </Box>
  );
}
