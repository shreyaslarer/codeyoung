/**
 * Frontend form validation utilities.
 * Single source of truth for parent contact inputs across forms and test suites.
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates parent booking input (name and email).
 *
 * Requirements:
 * - Parent name: minimum 2 non-whitespace characters
 * - Email address: standard RFC-compliant email structure with '@' and domain
 */
export function validateParentInput(name: string, email: string): ValidationResult {
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return {
      isValid: false,
      error: 'Please enter a valid parent name with at least 2 characters.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return {
      isValid: false,
      error: 'Please enter a valid email address.',
    };
  }

  return { isValid: true };
}
