import {
  ALL_SKILL_CATEGORY_FILTER,
  type SkillCategoryFilter,
  skillMatchesCategoryFilter,
} from '../../types.js';

interface CategorizedSkill {
  categories: string[];
}

export function getVisibleSkills<T extends CategorizedSkill>(
  skills: T[],
  filter: SkillCategoryFilter
): T[] {
  return skills.filter((skill) => skillMatchesCategoryFilter(skill, filter));
}

export function getVisibleSkillIndices<T extends CategorizedSkill>(
  skills: T[],
  filter: SkillCategoryFilter
): number[] {
  return skills.flatMap((skill, index) =>
    skillMatchesCategoryFilter(skill, filter) ? [index] : []
  );
}

export function getVisibleFocusedSkillIndex<T extends CategorizedSkill>(
  skills: T[],
  filter: SkillCategoryFilter,
  focusedIndex: number
): number {
  const visibleIndices = getVisibleSkillIndices(skills, filter);
  if (visibleIndices.length === 0) return 0;

  const focusedVisibleIndex = visibleIndices.indexOf(focusedIndex);
  return focusedVisibleIndex >= 0 ? focusedVisibleIndex : 0;
}

export function getClampedFocusedSkillIndex<T extends CategorizedSkill>(
  skills: T[],
  filter: SkillCategoryFilter,
  focusedIndex: number
): number {
  const visibleIndices = getVisibleSkillIndices(skills, filter);
  if (visibleIndices.length === 0) return 0;

  if (visibleIndices.includes(focusedIndex)) {
    return focusedIndex;
  }

  return visibleIndices[0];
}

export function getFocusedVisibleSkill<T extends CategorizedSkill>(
  skills: T[],
  filter: SkillCategoryFilter,
  focusedIndex: number
): T | null {
  const visibleSkills = getVisibleSkills(skills, filter);
  if (visibleSkills.length === 0) return null;

  return visibleSkills[getVisibleFocusedSkillIndex(skills, filter, focusedIndex)] ?? null;
}

export function resolveNextSkillCategoryFilter(
  categories: SkillCategoryFilter[],
  current: SkillCategoryFilter,
  direction: -1 | 1
): SkillCategoryFilter {
  if (categories.length === 0) {
    return ALL_SKILL_CATEGORY_FILTER;
  }

  const currentIndex = categories.indexOf(current);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (startIndex + direction + categories.length) % categories.length;
  return categories[nextIndex];
}
