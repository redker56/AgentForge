/**
 * Fuzzy search overlay with blinking cursor and match highlighting.
 *
 * Searches across skill names, agent names, and project IDs using
 * fzf-style character subsequence matching. Matched characters are
 * highlighted in bold accent color.
 *
 * Fixed-height results (max 8 visible) to prevent terminal window jitter.
 */

import { Box, Text, useInput, useStdout } from 'ink';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { computeSearchResults } from '../utils/search.js';
import { getVisibleSkills } from '../utils/skillsView.js';

interface SearchOverlayProps {
  store: StoreApi<AppStore>;
}

const MAX_VISIBLE_RESULTS = 8;
const SEARCH_HINT = 'Type to search in the current tab';

function truncateText(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return '';
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  return `${text.slice(0, maxWidth - 3)}...`;
}

function HighlightedText({
  text,
  matchIndices,
  selected,
}: {
  text: string;
  matchIndices: number[];
  selected: boolean;
}): React.ReactElement {
  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices]);

  const segments: React.ReactElement[] = [];
  let i = 0;
  while (i < text.length) {
    const isMatch = matchSet.has(i);
    let j = i;
    while (j < text.length && matchSet.has(j) === isMatch) {
      j++;
    }
    const segment = text.slice(i, j);
    if (isMatch) {
      segments.push(
        <Text bold color={inkColors.accent} key={`m-${i}`}>{segment}</Text>
      );
    } else {
      segments.push(
        <Text color={selected ? inkColors.focusText : inkColors.secondary} key={`u-${i}`}>
          {segment}
        </Text>
      );
    }
    i = j;
  }

  return <>{segments}</>;
}

export function SearchOverlay({ store }: SearchOverlayProps): React.ReactElement {
  const { stdout } = useStdout();
  const searchQuery = useStore(store, (s) => s.searchQuery);
  const skills = useStore(store, (s) => s.skills);
  const activeSkillCategoryFilter = useStore(store, (s) => s.activeSkillCategoryFilter);
  const agents = useStore(store, (s) => s.agents);
  const projects = useStore(store, (s) => s.projects);
  const searchResultIndex = useStore(store, (s) => s.searchResultIndex);
  const activeTab = useStore(store, (s) => s.activeTab);
  const overlayWidth = Math.max((stdout?.columns ?? 100) - 4, 24);
  const resultWidth = Math.max(overlayWidth - 2, 20);
  const displayQuery = truncateText(searchQuery || '', Math.max(overlayWidth - 12, 8));

  const searchableSkills = activeTab === 'skills'
    ? getVisibleSkills(skills, activeSkillCategoryFilter)
    : skills;
  const results = useMemo(
    () => computeSearchResults(searchQuery, searchableSkills, agents, projects, activeTab),
    [searchQuery, searchableSkills, agents, projects, activeTab]
  );

  const clampedIdx = Math.min(searchResultIndex, Math.max(results.length - 1, 0));
  const [scrollTop, setScrollTop] = useState(0);

  const totalResults = results.length;
  const hasMoreAbove = scrollTop > 0;
  const hasMoreBelow = totalResults > scrollTop + MAX_VISIBLE_RESULTS;

  useEffect(() => {
    setScrollTop(0);
  }, [results.length]);

  useEffect(() => {
    if (clampedIdx < scrollTop) {
      setScrollTop(clampedIdx);
    } else if (clampedIdx >= scrollTop + MAX_VISIBLE_RESULTS) {
      setScrollTop(clampedIdx - MAX_VISIBLE_RESULTS + 1);
    }
  }, [clampedIdx, scrollTop]);

  const visibleResults = results.slice(scrollTop, scrollTop + MAX_VISIBLE_RESULTS);
  const summaryLine = !searchQuery.trim()
    ? SEARCH_HINT
    : results.length === 0
      ? `No results for "${searchQuery}"`
      : `${results.length} result${results.length !== 1 ? 's' : ''} for "${searchQuery}"${
          hasMoreAbove || hasMoreBelow
            ? ` (${hasMoreAbove ? `^${scrollTop}` : ''}${hasMoreAbove && hasMoreBelow ? ', ' : ''}${
                hasMoreBelow ? `v${totalResults - scrollTop - visibleResults.length}` : ''
              })`
            : ''
        }`;
  const paddedResults = [
    ...visibleResults,
    ...Array.from({ length: MAX_VISIBLE_RESULTS - visibleResults.length }, () => null),
  ];

  useInput((input, key) => {
    const state = store.getState();

    if (key.escape) {
      state.setShowSearch(false);
      return;
    }

    if (key.return) {
      const query = state.searchQuery;
      if (!query.trim()) {
        state.setShowSearch(false);
        return;
      }

      const currentResults = computeSearchResults(
        query,
        state.activeTab === 'skills'
          ? getVisibleSkills(state.skills, state.activeSkillCategoryFilter)
          : state.skills,
        state.agents,
        state.projects,
        state.activeTab
      );
      const idx = Math.min(state.searchResultIndex, Math.max(currentResults.length - 1, 0));

      if (currentResults[idx]) {
        const result = currentResults[idx];
        state.setActiveTab(result.tabId);

        if (result.tabId === 'skills') {
          const skillIndex = state.skills.findIndex((s) => s.name === result.itemId);
          if (skillIndex >= 0) state.setFocusedSkillIndex(skillIndex);
        } else if (result.tabId === 'agents') {
          const agentIndex = state.agents.findIndex((a) => a.id === result.itemId);
          if (agentIndex >= 0) state.setFocusedAgentIndex(agentIndex);
        } else if (result.tabId === 'projects') {
          const projectIndex = state.projects.findIndex((p) => p.id === result.itemId);
          if (projectIndex >= 0) state.setFocusedProjectIndex(projectIndex);
        }
      }

      state.setShowSearch(false);
      return;
    }

    if (key.upArrow) {
      const currentIdx = store.getState().searchResultIndex;
      if (currentIdx > 0) {
        state.setSearchResultIndex(currentIdx - 1);
      }
      return;
    }
    if (key.downArrow) {
      const currentResults = computeSearchResults(
        state.searchQuery,
        state.activeTab === 'skills'
          ? getVisibleSkills(state.skills, state.activeSkillCategoryFilter)
          : state.skills,
        state.agents,
        state.projects,
        state.activeTab
      );
      const currentIdx = store.getState().searchResultIndex;
      if (currentIdx < currentResults.length - 1) {
        state.setSearchResultIndex(currentIdx + 1);
      }
      return;
    }

    if (key.backspace || key.delete) {
      state.setSearchResultIndex(0);
      state.setSearchQuery(state.searchQuery.slice(0, -1));
      return;
    }

    if (input && input.length === 1 && !key.ctrl && !key.meta) {
      state.setSearchResultIndex(0);
      state.setSearchQuery(state.searchQuery + input);
    }
  }, {
    isActive: store.getState().showSearch,
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Box
        flexDirection="column"
        borderStyle="single"
        paddingLeft={1}
        paddingRight={1}
        borderColor={inkColors.borderActive}
      >
        <Text color={inkColors.muted}>Search</Text>
        <Box>
          <Text color={inkColors.accent}>Query</Text>
          <Text color={inkColors.muted}> / </Text>
          <Text color={inkColors.primary}>{displayQuery}</Text>
          <Text color={inkColors.accent}>{'\u2588'}</Text>
        </Box>
      </Box>
      <Box flexDirection="column" minHeight={MAX_VISIBLE_RESULTS + 1}>
        <Text color={inkColors.muted}>{truncateText(`  ${summaryLine}`, resultWidth)}</Text>
        {paddedResults.map((result, i) => {
          if (!result) {
            return <Text key={`empty-${i}`}> </Text>;
          }

          const actualIndex = scrollTop + i;
          const availableNameWidth = Math.max(resultWidth - result.tabLabel.length - 6, 8);
          const displayName = truncateText(result.name, availableNameWidth);
          const displayMatchIndices = result.matchIndices.filter((index) => index < displayName.length);
          const isSelected = actualIndex === clampedIdx;

          return (
            <Box key={`${result.tabId}-${result.itemId}`}>
              <Text
                color={isSelected ? inkColors.focusText : inkColors.secondary}
                backgroundColor={isSelected ? inkColors.paper : undefined}
                bold={isSelected}
              >
                <HighlightedText
                  text={displayName}
                  matchIndices={displayMatchIndices}
                  selected={isSelected}
                />
                {'  '}
              </Text>
              <Text
                color={isSelected ? inkColors.focusText : inkColors.muted}
                backgroundColor={isSelected ? inkColors.paper : undefined}
                bold={isSelected}
              >
                [{result.tabLabel}]
              </Text>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
