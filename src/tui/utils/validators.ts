/**
 * Validation functions for BlurValidatedInput in AddForm fields.
 */

export function validateUrl(value: string): string | null {
  if (!value.trim()) return 'Git URL is required';
  try {
    // Basic URL pattern check
    const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    if (!urlPattern.test(value.trim())) return 'Enter a valid URL (https://...)';
    return null;
  } catch {
    return 'Enter a valid URL (https://...)';
  }
}

export function validateSkillName(value: string): string | null {
  if (!value.trim()) return 'Name is required';
  if (/\s/.test(value)) return 'No spaces allowed';
  if (!/^[a-zA-Z0-9-]+$/.test(value)) return 'Only alphanumeric and hyphens';
  return null;
}

export function validateNonEmpty(value: string, fieldName: string): string | null {
  if (!value.trim()) return `${fieldName} is required`;
  return null;
}

export function validateAgentId(value: string): string | null {
  if (!value.trim()) return 'ID is required';
  if (!/^[a-zA-Z0-9-_]+$/.test(value)) return 'Only letters, numbers, hyphens, underscores';
  return null;
}
