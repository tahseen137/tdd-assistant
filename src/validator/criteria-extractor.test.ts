/**
 * Criteria Extractor Tests
 * 
 * Requirements: 8.4
 */

import * as fc from 'fast-check';
import {
  createCriteriaExtractor,
  generateCriterionId,
  inferCriterionType,
  extractKeywords
} from './criteria-extractor';
import { UserStory } from '../parser/story-parser';
import { AcceptanceCriterion } from './types';

describe('Criteria Extractor', () => {
  describe('generateCriterionId', () => {
    it('should generate sequential IDs starting from AC-1', () => {
      expect(generateCriterionId(0)).toBe('AC-1');
      expect(generateCriterionId(1)).toBe('AC-2');
      expect(generateCriterionId(9)).toBe('AC-10');
    });
  });

  describe('inferCriterionType', () => {
    it('should identify error types', () => {
      expect(inferCriterionType('System displays error message')).toBe('error');
      expect(inferCriterionType('Handle invalid input')).toBe('error');
      expect(inferCriterionType('Reject unauthorized access')).toBe('error');
    });

    it('should identify edge case types', () => {
      expect(inferCriterionType('Handle empty input')).toBe('edge_case');
      expect(inferCriterionType('Process null values')).toBe('edge_case');
      expect(inferCriterionType('Handle duplicate entries')).toBe('edge_case');
    });

    it('should identify boundary types', () => {
      expect(inferCriterionType('Handle maximum value')).toBe('boundary');
      expect(inferCriterionType('Process zero items')).toBe('boundary');
      expect(inferCriterionType('Check limit exceeded')).toBe('boundary');
    });

    it('should identify happy path types', () => {
      expect(inferCriterionType('User successfully logs in')).toBe('happy_path');
      expect(inferCriterionType('Valid data is processed')).toBe('happy_path');
    });

    it('should default to functional for unmatched descriptions', () => {
      expect(inferCriterionType('User can view dashboard')).toBe('functional');
      expect(inferCriterionType('System sends notification')).toBe('functional');
    });
  });

  describe('extractKeywords', () => {
    it('should extract meaningful keywords', () => {
      const keywords = extractKeywords('User can login with email and password');
      expect(keywords).toContain('user');
      expect(keywords).toContain('login');
      expect(keywords).toContain('email');
      expect(keywords).toContain('password');
      expect(keywords).not.toContain('can');
      expect(keywords).not.toContain('with');
      expect(keywords).not.toContain('and');
    });

    it('should return unique keywords', () => {
      const keywords = extractKeywords('User user USER login login');
      const uniqueCount = new Set(keywords).size;
      expect(keywords.length).toBe(uniqueCount);
    });
  });

  describe('parseFromText', () => {
    it('should parse numbered criteria', () => {
      const extractor = createCriteriaExtractor();
      const text = `
        1. User can login with valid credentials
        2. System displays error for invalid password
        3. User is redirected to dashboard after login
      `;
      
      const criteria = extractor.parseFromText(text);
      
      expect(criteria.length).toBe(3);
      expect(criteria[0].description).toContain('login with valid credentials');
      expect(criteria[1].description).toContain('error for invalid password');
      expect(criteria[2].description).toContain('redirected to dashboard');
    });

    it('should parse bulleted criteria', () => {
      const extractor = createCriteriaExtractor();
      const text = `
        - User can create a new account
        - System validates email format
        * Password must be at least 8 characters
      `;
      
      const criteria = extractor.parseFromText(text);
      
      expect(criteria.length).toBe(3);
    });

    it('should assign unique IDs to each criterion', () => {
      const extractor = createCriteriaExtractor();
      const text = `
        1. First criterion
        2. Second criterion
        3. Third criterion
      `;
      
      const criteria = extractor.parseFromText(text);
      const ids = criteria.map(c => c.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(criteria.length);
    });

    it('should skip short lines and headers', () => {
      const extractor = createCriteriaExtractor();
      const text = `
        Acceptance Criteria:
        OK
        1. User can login with valid email and password
        2. System displays appropriate error message
      `;
      
      const criteria = extractor.parseFromText(text);
      
      expect(criteria.length).toBe(2);
    });
  });
});

/**
 * Property-Based Tests for Criteria Extractor
 * 
 * Feature: tdd-assistant, Property 10: Acceptance Criteria Extraction Completeness
 * Validates: Requirements 8.4
 */
describe('Property-Based Tests: Acceptance Criteria Extraction Completeness', () => {
  /**
   * Feature: tdd-assistant, Property 10: Acceptance Criteria Extraction Completeness
   * Validates: Requirements 8.4
   * 
   * For any user story with explicitly listed acceptance criteria, the criteria 
   * extractor should identify and return all listed criteria as separate 
   * AcceptanceCriterion objects.
   */
  it('Property 10: should extract all explicitly listed acceptance criteria', async () => {
    // Arbitrary for generating valid criterion descriptions (meaningful text)
    const criterionDescriptionArb = fc.tuple(
      fc.constantFrom('User', 'System', 'Admin', 'Developer'),
      fc.constantFrom('can', 'should', 'must', 'will'),
      fc.constantFrom(
        'login with valid credentials',
        'view the dashboard',
        'create a new account',
        'update profile information',
        'delete existing records',
        'search for items',
        'filter results by category',
        'export data to CSV',
        'receive email notifications',
        'reset password via email',
        'handle invalid input gracefully',
        'display error message for failures',
        'validate required fields',
        'process payment successfully',
        'generate detailed reports'
      )
    ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

    // Arbitrary for generating a list of criteria (1-10 criteria)
    const criteriaListArb = fc.array(criterionDescriptionArb, { minLength: 1, maxLength: 10 });

    // Arbitrary for generating different list formats
    const formatArb = fc.constantFrom('numbered', 'bulleted-dash', 'bulleted-star');

    await fc.assert(
      fc.asyncProperty(criteriaListArb, formatArb, async (criteriaDescriptions, format) => {
        // Format criteria as text based on the format type
        let formattedText: string;
        switch (format) {
          case 'numbered':
            formattedText = criteriaDescriptions
              .map((desc, i) => `${i + 1}. ${desc}`)
              .join('\n');
            break;
          case 'bulleted-dash':
            formattedText = criteriaDescriptions
              .map(desc => `- ${desc}`)
              .join('\n');
            break;
          case 'bulleted-star':
            formattedText = criteriaDescriptions
              .map(desc => `* ${desc}`)
              .join('\n');
            break;
          default:
            formattedText = criteriaDescriptions.join('\n');
        }

        const extractor = createCriteriaExtractor();
        const extractedCriteria = extractor.parseFromText(formattedText);

        // Property 1: Number of extracted criteria should match input count
        const countMatches = extractedCriteria.length === criteriaDescriptions.length;

        // Property 2: Each extracted criterion should have a unique ID
        const ids = extractedCriteria.map(c => c.id);
        const uniqueIds = new Set(ids);
        const allIdsUnique = uniqueIds.size === extractedCriteria.length;

        // Property 3: Each extracted criterion should have a non-empty description
        const allHaveDescriptions = extractedCriteria.every(
          c => c.description && c.description.trim().length > 0
        );

        // Property 4: Each extracted criterion should have a valid type
        const validTypes = ['happy_path', 'error', 'edge_case', 'boundary', 'functional'];
        const allHaveValidTypes = extractedCriteria.every(
          c => validTypes.includes(c.type)
        );

        // Property 5: Each extracted criterion should have keywords array
        const allHaveKeywords = extractedCriteria.every(
          c => Array.isArray(c.keywords)
        );

        // Property 6: Each original description should be represented in extracted criteria
        const extractedDescriptions = extractedCriteria.map(c => c.description.toLowerCase());
        const allOriginalsCovered = criteriaDescriptions.every(original => {
          const lowerOriginal = original.toLowerCase();
          // Check if any extracted description contains the key parts of the original
          return extractedDescriptions.some(extracted => {
            // Extract key words from original (skip common words)
            const keyWords = lowerOriginal.split(' ').filter(w => 
              w.length > 3 && !['user', 'system', 'admin', 'developer', 'can', 'should', 'must', 'will', 'the', 'with', 'for', 'via'].includes(w)
            );
            // At least some key words should be present
            return keyWords.length === 0 || keyWords.some(kw => extracted.includes(kw));
          });
        });

        return countMatches && allIdsUnique && allHaveDescriptions && 
               allHaveValidTypes && allHaveKeywords && allOriginalsCovered;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 10: ID Generation Consistency
   * Validates: Requirements 8.4
   * 
   * For any number of criteria, IDs should be sequential starting from AC-1
   */
  it('Property 10: IDs should be sequential starting from AC-1', async () => {
    const criteriaCountArb = fc.integer({ min: 1, max: 20 });

    await fc.assert(
      fc.asyncProperty(criteriaCountArb, async (count) => {
        // Generate criteria text
        const criteriaText = Array.from({ length: count }, (_, i) => 
          `${i + 1}. Test criterion number ${i + 1} with sufficient length`
        ).join('\n');

        const extractor = createCriteriaExtractor();
        const extractedCriteria = extractor.parseFromText(criteriaText);

        // Property: IDs should be AC-1, AC-2, ..., AC-N
        const expectedIds = Array.from({ length: count }, (_, i) => `AC-${i + 1}`);
        const actualIds = extractedCriteria.map(c => c.id);

        return JSON.stringify(actualIds) === JSON.stringify(expectedIds);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 10: Type Inference Determinism
   * Validates: Requirements 8.4
   * 
   * For any criterion description, the inferred type should be deterministic
   */
  it('Property 10: type inference should be deterministic', async () => {
    const descriptionArb = fc.constantFrom(
      'User can login successfully',
      'System displays error message',
      'Handle empty input gracefully',
      'Check maximum value limit',
      'Process data correctly'
    );

    await fc.assert(
      fc.asyncProperty(descriptionArb, async (description) => {
        // Call inferCriterionType multiple times
        const type1 = inferCriterionType(description);
        const type2 = inferCriterionType(description);
        const type3 = inferCriterionType(description);

        // Property: Same input should always produce same output
        return type1 === type2 && type2 === type3;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 10: Keyword Extraction Consistency
   * Validates: Requirements 8.4
   * 
   * For any description, extracted keywords should be unique and non-empty
   */
  it('Property 10: extracted keywords should be unique and meaningful', async () => {
    const descriptionArb = fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '),
      { minLength: 20, maxLength: 100 }
    ).map(s => s.trim());

    await fc.assert(
      fc.asyncProperty(descriptionArb, async (description) => {
        const keywords = extractKeywords(description);

        // Property 1: All keywords should be unique
        const uniqueKeywords = new Set(keywords);
        const allUnique = uniqueKeywords.size === keywords.length;

        // Property 2: All keywords should have length > 2
        const allMeaningful = keywords.every(k => k.length > 2);

        // Property 3: Keywords should be lowercase
        const allLowercase = keywords.every(k => k === k.toLowerCase());

        return allUnique && allMeaningful && allLowercase;
      }),
      { numRuns: 100 }
    );
  });
});
