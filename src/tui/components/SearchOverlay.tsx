/**
 * Fuzzy search overlay with blinking cursor and match highlighting.
 *
 * Searches across skill names, agent names, and project IDs using
 * fzf-style character subsequence matching. Matched characters are
 * highlighted in bold accent color.
 * Modern Claude Code aesthetic.
 *
 * Fixed-height results (max 8 visible) to prevent terminal window jitter.
 */

import { Box, Text, useInput } from 'ink';
import React, { useMemo, useState, useEffect } from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand';

import type { AppStore } from '../store/index.js';
import { inkColors } from '../theme.js';
import { computeSearchResults } from '../utils/search.js';

interface SearchOverlayProps {
  store: StoreApi<AppStore>;
}

// Maximum visible results to prevent layout jitter
const MAX_VISIBLE_RESULTS = 8;

function HighlightedText({ text, matchIndices }: { text: string; matchIndices: number[] }): React.ReactElement {
  const matchSet = useMemo(() => new Set(matchIndices), [matchIndices]);

  const segments: React.ReactElement[] = [];
  let i = 0;
  while (i < text.length) {
    // Find contiguous run of matched or unmatched characters
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
        <Text color={inkColors.secondary} key={`u-${i}`}>{segment}</Text>
      );
    }
    i = j;
  }

  return <>{segments}</>;
}

export function SearchOverlay({ store }: SearchOverlayProps): React.ReactElement {
  const searchQuery = useStore(store, s => s.searchQuery);
  const skills = useStore(store, s => s.skills);
  const agents = useStore(store, s => s.agents);
  const projects = useStore(store, s => s.projects);
  const searchResultIndex = useStore(store, s => s.searchResultIndex);
  const activeTab = useStore(store, s => s.activeTab);

  const results = useMemo(
    () => computeSearchResults(searchQuery, skills, agents, projects, activeTab),
    [searchQuery, skills, agents, projects, activeTab]
  );

  // Clamp focus index to results length
  const clampedIdx = Math.min(searchResultIndex, Math.max(results.length - 1, 0));

  // Internal scroll state for fixed-height results
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate visible range
  const totalResults = results.length;
  const hasMoreAbove = scrollTop > 0;
  const hasMoreBelow = totalResults > scrollTop + MAX_VISIBLE_RESULTS;

  // Reset scroll when results change
  useEffect(() => {
    setScrollTop(0);
  }, [results.length]);

  // Sync scroll with focused index (keyboard navigation)
  useEffect(() => {
    if (clampedIdx < scrollTop) {
      setScrollTop(clampedIdx);
    } else if (clampedIdx >= scrollTop + MAX_VISIBLE_RESULTS) {
      setScrollTop(clampedIdx - MAX_VISIBLE_RESULTS + 1);
    }
  }, [clampedIdx, scrollTop]);

  const visibleResults = results.slice(scrollTop, scrollTop + MAX_VISIBLE_RESULTS);

  // Local input handler for search keys
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

      const currentResults = computeSearchResults(query, state.skills, state.agents, state.projects, state.activeTab);
      const idx = Math.min(state.searchResultIndex, Math.max(currentResults.length - 1, 0));

      if (currentResults[idx]) {
        const result = currentResults[idx];
        state.setActiveTab(result.tabId);

        if (result.tabId === 'skills') {
          const skillIndex = state.skills.findIndex(s => s.name === result.itemId);
          if (skillIndex >= 0) state.setFocusedSkillIndex(skillIndex);
        } else if (result.tabId === 'agents') {
          const agentIndex = state.agents.findIndex(a => a.id === result.itemId);
          if (agentIndex >= 0) state.setFocusedAgentIndex(agentIndex);
        } else if (result.tabId === 'projects') {
          const projectIndex = state.projects.findIndex(p => p.id === result.itemId);
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
      const currentResults = computeSearchResults(state.searchQuery, state.skills, state.agents, state.projects, state.activeTab);
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
      <Box borderStyle="single" paddingLeft={1} paddingRight={1} borderColor={inkColors.muted}>
        <Text color={inkColors.accent}>Search: </Text>
        <Text>{searchQuery || ''}</Text>
        <Text color={inkColors.accent}>{'\u2588'}</Text>
      </Box>
      {results.length > 0 && (
        <Box flexDirection="column">
          <Text color={inkColors.muted}>  {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"</Text>
          {hasMoreAbove && (
            <Text color={inkColors.muted}>  ^ {scrollTop} more above</Text>
          )}
          {visibleResults.map((result, i) => {
            const actualIndex = scrollTop + i;
            return (
              <Box key={`${result.tabId}-${result.itemId}`}>
                <Text
                  color={actualIndex === clampedIdx ? inkColors.accent : inkColors.secondary}
                  bold={actualIndex === clampedIdx}
                >
                  <HighlightedText text={result.name} matchIndices={result.matchIndices} />
                  {'  '}
                </Text>
                <Text
                  color={actualIndex === clampedIdx ? inkColors.accent : inkColors.muted}
                  bold={actualIndex === clampedIdx}
                >
                  [{result.tabLabel}]
                </Text>
              </Box>
            );
          })}
          {hasMoreBelow && (
            <Text color={inkColors.muted}>  v {totalResults - scrollTop - MAX_VISIBLE_RESULTS} more below</Text>
          )}
        </Box>
      )}
      {searchQuery.trim() && results.length === 0 && (
        <Text color={inkColors.muted}>  No results found</Text>
      )}
    </Box>
  );
}
