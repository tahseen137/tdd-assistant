/**
 * User Story Parser
 * Parses user stories into structured format
 */

export interface UserStory {
  role: string;
  feature: string;
  benefit: string;
  rawText: string;
  acceptanceCriteria?: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface StoryParser {
  parse(storyText: string): UserStory;
  validate(story: UserStory): ValidationResult;
}

/**
 * Default implementation of StoryParser
 * Parses user stories in the format: "As a [role], I want [feature], so that [benefit]"
 */
export class DefaultStoryParser implements StoryParser {
  // Regex patterns for parsing user stories
  // Standard format: "As a [role], I want [feature], so that [benefit]"
  private readonly standardPattern = /^as\s+(?:a|an)\s+(.+?),?\s+i\s+want\s+(?:to\s+)?(.+?),?\s+so\s+that\s+(.+)$/i;
  
  // Format without "so that": "As a [role], I want [feature]"
  private readonly withoutBenefitPattern = /^as\s+(?:a|an)\s+(.+?),?\s+i\s+want\s+(?:to\s+)?(.+)$/i;

  /**
   * Parse a user story text into structured UserStory object
   * @param storyText - The raw user story text
   * @returns UserStory object with extracted components
   */
  parse(storyText: string): UserStory {
    const trimmedText = storyText.trim();
    
    // Try standard format first
    let match = trimmedText.match(this.standardPattern);
    if (match) {
      return {
        role: this.cleanField(match[1]),
        feature: this.cleanField(match[2]),
        benefit: this.cleanField(match[3]),
        rawText: trimmedText,
      };
    }

    // Try format without "so that"
    match = trimmedText.match(this.withoutBenefitPattern);
    if (match) {
      return {
        role: this.cleanField(match[1]),
        feature: this.cleanField(match[2]),
        benefit: '', // No benefit specified
        rawText: trimmedText,
      };
    }

    // If no pattern matches, return empty fields
    return {
      role: '',
      feature: '',
      benefit: '',
      rawText: trimmedText,
    };
  }

  /**
   * Validate a parsed user story for completeness
   * @param story - The parsed UserStory object
   * @returns ValidationResult with isValid flag and any errors
   */
  validate(story: UserStory): ValidationResult {
    const errors: string[] = [];

    if (!story.role || story.role.trim() === '') {
      errors.push('User story is missing the role (who)');
    }

    if (!story.feature || story.feature.trim() === '') {
      errors.push('User story is missing the feature (what)');
    }

    if (!story.benefit || story.benefit.trim() === '') {
      errors.push('User story is missing the benefit (why) - consider adding "so that [benefit]"');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Clean a field by trimming whitespace and removing trailing punctuation
   */
  private cleanField(field: string): string {
    return field
      .trim()
      .replace(/[.,;:]+$/, '') // Remove trailing punctuation
      .trim();
  }
}

/**
 * Factory function to create a StoryParser instance
 */
export function createStoryParser(): StoryParser {
  return new DefaultStoryParser();
}
