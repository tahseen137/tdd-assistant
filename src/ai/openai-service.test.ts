/**
 * Property-based tests for AI Service
 * Feature: tdd-assistant, Property 2: Test Case Count Matches Acceptance Criteria
 * Validates: Requirements 2.2
 */

import * as fc from 'fast-check';
import { 
  extractTestCases, 
  categorizeTestCases,
  isValidTestCaseType,
  inferTestCaseType,
  sanitizeTestName,
  extractJsonFromResponse
} from './test-case-extractor';
import { TestCase, TestCaseType, parseTestCasesFromResponse } from './openai-service';

/**
 * Arbitrary generator for valid test case types
 */
const testCaseTypeArb = fc.constantFrom<TestCaseType>('happy_path', 'error', 'edge_case', 'boundary');

/**
 * Arbitrary generator for non-empty alphanumeric strings (valid for test names)
 */
const validNameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
  { minLength: 3, maxLength: 30 }
);

/**
 * Arbitrary generator for description strings
 */
const descriptionArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
  { minLength: 5, maxLength: 100 }
);

/**
 * Arbitrary generator for assertion strings
 */
const assertionArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
  { minLength: 5, maxLength: 50 }
);

/**
 * Arbitrary generator for a valid TestCase object
 */
const testCaseArb: fc.Arbitrary<TestCase> = fc.record({
  name: validNameArb,
  description: descriptionArb,
  type: testCaseTypeArb,
  assertions: fc.array(assertionArb, { minLength: 0, maxLength: 5 }),
  mockDependencies: fc.array(
    fc.constantFrom('UserService', 'UserRepository', 'EmailService', 'AuthService', 'PaymentGateway'),
    { minLength: 0, maxLength: 3 }
  )
});

/**
 * Generate a valid JSON response string from test cases
 */
function generateJsonResponse(testCases: TestCase[]): string {
  return JSON.stringify(testCases);
}

/**
 * Generate a JSON response wrapped in markdown code block
 */
function generateMarkdownResponse(testCases: TestCase[]): string {
  return '```json\n' + JSON.stringify(testCases, null, 2) + '\n```';
}

describe('AI Service - Test Case Extraction', () => {
  describe('Property 2: Test Case Count Matches Acceptance Criteria', () => {
    /**
     * Property 2: Test Case Count Matches Acceptance Criteria
     * For any user story with N acceptance criteria, the AI engine should generate at least N test cases.
     * 
     * Since we can't test the actual AI response, we test that:
     * - When we generate N test cases in a response, we extract exactly N test cases
     * - The extraction preserves all test cases without loss
     * 
     * Validates: Requirements 2.2
     */
    it('should extract exactly N test cases when response contains N valid test cases', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 10 }),
          (testCases) => {
            const jsonResponse = generateJsonResponse(testCases);
            const result = extractTestCases(jsonResponse);
            
            // Should extract exactly the same number of test cases
            expect(result.testCases.length).toBe(testCases.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract test cases from markdown code blocks', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 10 }),
          (testCases) => {
            const markdownResponse = generateMarkdownResponse(testCases);
            const result = extractTestCases(markdownResponse);
            
            // Should extract exactly the same number of test cases
            expect(result.testCases.length).toBe(testCases.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve test case types during extraction', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 10 }),
          (testCases) => {
            const jsonResponse = generateJsonResponse(testCases);
            const result = extractTestCases(jsonResponse);
            
            // Each extracted test case should have a valid type
            for (const tc of result.testCases) {
              expect(isValidTestCaseType(tc.type)).toBe(true);
            }
            
            // Types should be preserved
            for (let i = 0; i < testCases.length; i++) {
              expect(result.testCases[i].type).toBe(testCases[i].type);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Test Case Categorization', () => {
    it('should correctly categorize test cases by type', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 20 }),
          (testCases) => {
            const categorized = categorizeTestCases(testCases);
            
            // Total count should match
            const totalCategorized = 
              categorized.happy_path.length +
              categorized.error.length +
              categorized.edge_case.length +
              categorized.boundary.length;
            
            expect(totalCategorized).toBe(testCases.length);
            
            // Each test case should be in the correct category
            for (const tc of testCases) {
              expect(categorized[tc.type]).toContainEqual(tc);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Test Name Sanitization', () => {
    it('should produce valid Java method names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (name) => {
            const sanitized = sanitizeTestName(name);
            
            // Should not be empty
            expect(sanitized.length).toBeGreaterThan(0);
            
            // Should start with a lowercase letter
            expect(/^[a-z]/.test(sanitized)).toBe(true);
            
            // Should only contain valid Java identifier characters
            expect(/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sanitized)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Type Inference', () => {
    it('should infer error type for error-related names', () => {
      const errorNames = [
        'shouldThrowExceptionWhenInvalid',
        'shouldReturnErrorForMissingData',
        'shouldFailWhenUnauthorized',
        'shouldRejectInvalidInput'
      ];
      
      for (const name of errorNames) {
        const type = inferTestCaseType(name, '');
        expect(type).toBe('error');
      }
    });

    it('should infer edge_case type for edge case names', () => {
      const edgeCaseNames = [
        'shouldHandleEmptyInput',
        'shouldHandleNullValue',
        'shouldHandleBlankString',
        'shouldHandleDuplicateEntries'
      ];
      
      for (const name of edgeCaseNames) {
        const type = inferTestCaseType(name, '');
        expect(type).toBe('edge_case');
      }
    });

    it('should infer boundary type for boundary-related names', () => {
      const boundaryNames = [
        'shouldHandleMaximumLimit',
        'shouldHandleMinimumValue',
        'shouldHandleZeroCount',
        'shouldHandleNegativeNumber'
      ];
      
      for (const name of boundaryNames) {
        const type = inferTestCaseType(name, '');
        expect(type).toBe('boundary');
      }
    });

    it('should default to happy_path for normal names', () => {
      const happyPathNames = [
        'shouldReturnUserWhenValidId',
        'shouldCreateOrderSuccessfully',
        'shouldUpdateProfileCorrectly'
      ];
      
      for (const name of happyPathNames) {
        const type = inferTestCaseType(name, '');
        expect(type).toBe('happy_path');
      }
    });
  });

  describe('JSON Extraction', () => {
    it('should extract JSON from plain text', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          (testCases) => {
            const json = JSON.stringify(testCases);
            const extracted = extractJsonFromResponse(json);
            
            // Should be valid JSON
            expect(() => JSON.parse(extracted)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should extract JSON from markdown code blocks', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          (testCases) => {
            const json = JSON.stringify(testCases);
            const markdown = '```json\n' + json + '\n```';
            const extracted = extractJsonFromResponse(markdown);
            
            // Should be valid JSON
            expect(() => JSON.parse(extracted)).not.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('parseTestCasesFromResponse', () => {
  it('should parse valid JSON response', () => {
    const testCases: TestCase[] = [
      {
        name: 'shouldReturnUser',
        description: 'Test user retrieval',
        type: 'happy_path',
        assertions: ['user is returned'],
        mockDependencies: ['UserRepository']
      }
    ];
    
    const result = parseTestCasesFromResponse(JSON.stringify(testCases));
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('shouldReturnUser');
  });

  it('should throw error for invalid JSON', () => {
    expect(() => parseTestCasesFromResponse('not valid json')).toThrow();
  });

  it('should return empty array for empty JSON array', () => {
    const result = parseTestCasesFromResponse('[]');
    expect(result.length).toBe(0);
  });
});
