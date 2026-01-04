/**
 * Criteria Extractor
 * Extracts acceptance criteria from user stories
 * 
 * Requirements: 8.4
 */

import { AcceptanceCriterion, CriterionType } from './types';
import { UserStory } from '../parser/story-parser';

/**
 * Interface for the Criteria Extractor
 */
export interface CriteriaExtractor {
  /**
   * Extract acceptance criteria from a user story using AI
   */
  extract(story: UserStory): Promise<AcceptanceCriterion[]>;
  
  /**
   * Parse acceptance criteria from explicit text list
   */
  parseFromText(text: string): AcceptanceCriterion[];
}

/**
 * Factory function to create a CriteriaExtractor instance
 * Implementation will be added in Task 3
 */
export function createCriteriaExtractor(): CriteriaExtractor {
  // Placeholder - implementation in Task 3
  throw new Error('Not implemented yet');
}

/**
 * Generate a unique criterion ID
 */
export function generateCriterionId(index: number): string {
  return `AC-${index + 1}`;
}

/**
 * Infer criterion type from description
 */
export function inferCriterionType(description: string): CriterionType {
  const lowerDesc = description.toLowerCase();
  
  // Check for error indicators
  const errorPatterns = [
    'error', 'exception', 'fail', 'invalid', 'unauthorized', 'forbidden',
    'not found', 'reject', 'denied', 'missing', 'wrong'
  ];
  if (errorPatterns.some(pattern => lowerDesc.includes(pattern))) {
    return 'error';
  }
  
  // Check for edge case indicators
  const edgeCasePatterns = [
    'edge', 'empty', 'null', 'blank', 'whitespace',
    'special character', 'unicode', 'duplicate', 'concurrent'
  ];
  if (edgeCasePatterns.some(pattern => lowerDesc.includes(pattern))) {
    return 'edge_case';
  }
  
  // Check for boundary indicators
  const boundaryPatterns = [
    'boundary', 'limit', 'max', 'min', 'zero', 'negative', 'overflow',
    'underflow', 'threshold', 'range', 'extreme', 'large', 'small'
  ];
  if (boundaryPatterns.some(pattern => lowerDesc.includes(pattern))) {
    return 'boundary';
  }
  
  // Check for happy path indicators
  const happyPathPatterns = [
    'success', 'valid', 'correct', 'proper', 'normal', 'expected'
  ];
  if (happyPathPatterns.some(pattern => lowerDesc.includes(pattern))) {
    return 'happy_path';
  }
  
  // Default to functional
  return 'functional';
}

/**
 * Extract keywords from a criterion description
 */
export function extractKeywords(description: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'during', 'before', 'after', 'above', 'below', 'between', 'under',
    'again', 'further', 'then', 'once', 'when', 'where', 'why', 'how',
    'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while',
    'that', 'this', 'these', 'those', 'it', 'its'
  ]);
  
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Return unique keywords
  return Array.from(new Set(words));
}
