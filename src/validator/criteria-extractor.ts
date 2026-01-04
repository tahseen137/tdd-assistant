/**
 * Criteria Extractor
 * Extracts acceptance criteria from user stories
 * 
 * Requirements: 8.4
 */

import { AcceptanceCriterion, CriterionType } from './types';
import { UserStory } from '../parser/story-parser';
import OpenAI from 'openai';

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
 * Configuration for CriteriaExtractor
 */
export interface CriteriaExtractorConfig {
  apiKey?: string;
  model?: string;
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

/**
 * Prompt template for extracting acceptance criteria from user stories
 */
const CRITERIA_EXTRACTION_PROMPT = `You are an acceptance criteria extraction expert. Analyze the following user story and extract all acceptance criteria.

User Story:
Role: {role}
Feature: {feature}
Benefit: {benefit}
{existingCriteria}

Extract acceptance criteria that define when this feature is complete. For each criterion:
- description: A clear, testable statement of what must be true
- type: One of "happy_path", "error", "edge_case", "boundary", or "functional"

If the story already has acceptance criteria listed, include them and add any implicit criteria.
If no criteria are listed, infer reasonable acceptance criteria from the story.

Respond with a JSON array. Example format:
[
  {
    "description": "User can login with valid email and password",
    "type": "happy_path"
  },
  {
    "description": "System displays error message for invalid credentials",
    "type": "error"
  }
]

Generate comprehensive criteria covering happy paths, error conditions, and edge cases.`;

/**
 * Build the prompt with user story details
 */
function buildCriteriaPrompt(story: UserStory): string {
  let existingCriteriaText = '';
  if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
    existingCriteriaText = '\nExisting Acceptance Criteria:\n' + 
      story.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n');
  }

  return CRITERIA_EXTRACTION_PROMPT
    .replace('{role}', story.role || 'user')
    .replace('{feature}', story.feature || 'feature')
    .replace('{benefit}', story.benefit || 'benefit')
    .replace('{existingCriteria}', existingCriteriaText);
}

/**
 * Parse AI response to extract criteria
 */
function parseCriteriaFromResponse(responseText: string): Array<{ description: string; type?: CriterionType }> {
  // Try to extract JSON from the response
  let jsonStr = responseText;
  
  // Handle markdown code blocks
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  // Try to find JSON array in the response
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed.filter(item => item && typeof item.description === 'string');
    }
  } catch {
    // If JSON parsing fails, try to extract criteria line by line
    const lines = responseText.split('\n');
    const criteria: Array<{ description: string; type?: CriterionType }> = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Match numbered or bulleted items
      const match = trimmed.match(/^(?:\d+\.|[-*•])\s*(.+)$/);
      if (match && match[1].length > 10) {
        criteria.push({ description: match[1] });
      }
    }
    
    return criteria;
  }
  
  return [];
}

/**
 * Default implementation of CriteriaExtractor
 */
class DefaultCriteriaExtractor implements CriteriaExtractor {
  private client: OpenAI | null = null;
  private config: CriteriaExtractorConfig;

  constructor(config: CriteriaExtractorConfig = {}) {
    this.config = config;
    
    // Try to get API key from environment if not provided
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    }
  }

  /**
   * Extract acceptance criteria from a user story using AI
   * Requirement: 8.4
   */
  async extract(story: UserStory): Promise<AcceptanceCriterion[]> {
    // If story already has explicit acceptance criteria, parse them first
    if (story.acceptanceCriteria && story.acceptanceCriteria.length > 0) {
      const explicitCriteria = this.parseFromText(story.acceptanceCriteria.join('\n'));
      
      // If we have explicit criteria and no AI client, return them
      if (!this.client || explicitCriteria.length >= 3) {
        return explicitCriteria;
      }
    }
    
    // Use AI to extract/enhance criteria
    if (this.client) {
      try {
        const prompt = buildCriteriaPrompt(story);
        
        const response = await this.client.chat.completions.create({
          model: this.config.model || 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an acceptance criteria extraction expert. Always respond with valid JSON arrays.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 1500
        });

        const content = response.choices[0]?.message?.content;
        
        if (content) {
          const parsedCriteria = parseCriteriaFromResponse(content);
          
          if (parsedCriteria.length > 0) {
            return parsedCriteria.map((item, index) => ({
              id: generateCriterionId(index),
              description: item.description,
              type: item.type || inferCriterionType(item.description),
              keywords: extractKeywords(item.description)
            }));
          }
        }
      } catch (error) {
        // Log error but continue with fallback
        console.warn('AI criteria extraction failed, using fallback:', error);
      }
    }
    
    // Fallback: generate basic criteria from story
    return this.generateFallbackCriteria(story);
  }

  /**
   * Parse acceptance criteria from explicit text list
   * Requirement: 8.4
   */
  parseFromText(text: string): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // Match various formats:
      // - Numbered: "1. Criterion text" or "1) Criterion text"
      // - Bulleted: "- Criterion text" or "* Criterion text" or "• Criterion text"
      // - GIVEN/WHEN/THEN format
      // - Plain text lines
      
      let description = trimmed;
      
      // Remove common prefixes
      const prefixMatch = trimmed.match(/^(?:\d+[.)]\s*|[-*•]\s*|(?:GIVEN|WHEN|THEN|AND)\s+)/i);
      if (prefixMatch) {
        description = trimmed.slice(prefixMatch[0].length).trim();
      }
      
      // Skip very short lines or headers
      if (description.length < 10) continue;
      if (description.toLowerCase().startsWith('acceptance criteria')) continue;
      
      criteria.push({
        id: generateCriterionId(criteria.length),
        description,
        type: inferCriterionType(description),
        keywords: extractKeywords(description)
      });
    }
    
    return criteria;
  }

  /**
   * Generate fallback criteria when AI is not available
   */
  private generateFallbackCriteria(story: UserStory): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    
    // Generate basic happy path criterion
    if (story.feature) {
      criteria.push({
        id: generateCriterionId(criteria.length),
        description: `User can successfully ${story.feature}`,
        type: 'happy_path',
        keywords: extractKeywords(story.feature)
      });
    }
    
    // Add error handling criterion
    criteria.push({
      id: generateCriterionId(criteria.length),
      description: `System handles errors gracefully when ${story.feature || 'operation'} fails`,
      type: 'error',
      keywords: ['error', 'handle', 'gracefully']
    });
    
    // Add validation criterion
    criteria.push({
      id: generateCriterionId(criteria.length),
      description: `System validates input before ${story.feature || 'processing'}`,
      type: 'functional',
      keywords: ['validate', 'input']
    });
    
    return criteria;
  }
}

/**
 * Factory function to create a CriteriaExtractor instance
 * Requirement: 8.4
 */
export function createCriteriaExtractor(config?: CriteriaExtractorConfig): CriteriaExtractor {
  return new DefaultCriteriaExtractor(config);
}
