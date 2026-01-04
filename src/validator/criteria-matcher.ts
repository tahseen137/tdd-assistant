/**
 * Criteria Matcher
 * Matches acceptance criteria to code implementations using AI
 * 
 * Requirements: 8.6, 8.8, 8.9, 8.10
 */

import { 
  AcceptanceCriterion, 
  CodeStructure, 
  SourceFile, 
  CriterionMatch,
  CoverageStatus,
  CodeEvidence
} from './types';

/**
 * Interface for the Criteria Matcher
 */
export interface CriteriaMatcher {
  /**
   * Match acceptance criteria to code implementations
   */
  match(
    criteria: AcceptanceCriterion[],
    codeStructures: CodeStructure[],
    sourceFiles: SourceFile[]
  ): Promise<CriterionMatch[]>;
}

/**
 * Factory function to create a CriteriaMatcher instance
 * Implementation will be added in Task 4
 */
export function createCriteriaMatcher(): CriteriaMatcher {
  // Placeholder - implementation in Task 4
  throw new Error('Not implemented yet');
}

/**
 * Create a CriterionMatch with 'covered' status
 */
export function createCoveredMatch(
  criterion: AcceptanceCriterion,
  evidence: CodeEvidence[],
  confidence: number
): CriterionMatch {
  return {
    criterion,
    status: 'covered',
    evidence,
    confidence: Math.min(100, Math.max(0, confidence))
  };
}

/**
 * Create a CriterionMatch with 'partially_covered' status
 */
export function createPartiallyCoveredMatch(
  criterion: AcceptanceCriterion,
  evidence: CodeEvidence[],
  confidence: number,
  suggestions: string[]
): CriterionMatch {
  return {
    criterion,
    status: 'partially_covered',
    evidence,
    confidence: Math.min(100, Math.max(0, confidence)),
    suggestions
  };
}

/**
 * Create a CriterionMatch with 'not_covered' status
 */
export function createNotCoveredMatch(
  criterion: AcceptanceCriterion,
  suggestions: string[]
): CriterionMatch {
  return {
    criterion,
    status: 'not_covered',
    evidence: [],
    confidence: 0,
    suggestions
  };
}

/**
 * Create a CodeEvidence object
 */
export function createCodeEvidence(
  filePath: string,
  snippet: string,
  explanation: string,
  lineNumbers: { start: number; end: number },
  className?: string,
  methodName?: string
): CodeEvidence {
  return {
    filePath,
    className,
    methodName,
    lineNumbers,
    snippet,
    explanation
  };
}

/**
 * Validate that a CriterionMatch has required fields based on status
 */
export function validateCriterionMatch(match: CriterionMatch): boolean {
  // Status must be one of the valid values
  const validStatuses: CoverageStatus[] = ['covered', 'partially_covered', 'not_covered'];
  if (!validStatuses.includes(match.status)) {
    return false;
  }
  
  // Covered and partially_covered must have evidence
  if ((match.status === 'covered' || match.status === 'partially_covered') && 
      match.evidence.length === 0) {
    return false;
  }
  
  // Not covered must have suggestions
  if (match.status === 'not_covered' && 
      (!match.suggestions || match.suggestions.length === 0)) {
    return false;
  }
  
  // Confidence must be in valid range
  if (match.confidence < 0 || match.confidence > 100) {
    return false;
  }
  
  return true;
}
