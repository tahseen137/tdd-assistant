/**
 * Criteria Matcher Tests
 * 
 * Requirements: 8.6, 8.8, 8.9, 8.10
 */

import * as fc from 'fast-check';
import {
  createCriteriaMatcher,
  createCoveredMatch,
  createPartiallyCoveredMatch,
  createNotCoveredMatch,
  createCodeEvidence,
  validateCriterionMatch
} from './criteria-matcher';
import {
  AcceptanceCriterion,
  CriterionMatch,
  CoverageStatus,
  CodeEvidence,
  CriterionType
} from './types';

/**
 * Property-Based Tests for Criteria Matcher
 * 
 * Feature: tdd-assistant, Property 12: Coverage Status Mutual Exclusivity
 * Validates: Requirements 8.8, 8.9, 8.10
 */
describe('Property-Based Tests: Coverage Status Mutual Exclusivity', () => {
  // Arbitrary for generating valid criterion types
  const criterionTypeArb: fc.Arbitrary<CriterionType> = fc.constantFrom(
    'happy_path', 'error', 'edge_case', 'boundary', 'functional'
  );

  // Arbitrary for generating valid coverage statuses
  const coverageStatusArb: fc.Arbitrary<CoverageStatus> = fc.constantFrom(
    'covered', 'partially_covered', 'not_covered'
  );

  // Arbitrary for generating valid criterion IDs
  const criterionIdArb = fc.integer({ min: 1, max: 100 }).map(n => `AC-${n}`);

  // Arbitrary for generating criterion descriptions
  const criterionDescriptionArb = fc.tuple(
    fc.constantFrom('User', 'System', 'Admin', 'Developer'),
    fc.constantFrom('can', 'should', 'must', 'will'),
    fc.constantFrom(
      'login with valid credentials',
      'view the dashboard',
      'create a new account',
      'update profile information',
      'delete existing records',
      'handle invalid input',
      'display error message'
    )
  ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

  // Arbitrary for generating keywords
  const keywordsArb = fc.array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 3, maxLength: 10 }),
    { minLength: 1, maxLength: 5 }
  );

  // Arbitrary for generating AcceptanceCriterion
  const acceptanceCriterionArb: fc.Arbitrary<AcceptanceCriterion> = fc.record({
    id: criterionIdArb,
    description: criterionDescriptionArb,
    type: criterionTypeArb,
    keywords: keywordsArb
  });

  // Arbitrary for generating CodeEvidence
  const codeEvidenceArb: fc.Arbitrary<CodeEvidence> = fc.record({
    filePath: fc.constantFrom('src/main/java/Service.java', 'src/app/service.ts', 'src/index.js'),
    className: fc.option(fc.constantFrom('UserService', 'AuthService', 'DataService'), { nil: undefined }),
    methodName: fc.option(fc.constantFrom('login', 'validate', 'process', 'handle'), { nil: undefined }),
    lineNumbers: fc.record({
      start: fc.integer({ min: 1, max: 100 }),
      end: fc.integer({ min: 100, max: 200 })
    }),
    snippet: fc.constantFrom(
      'public void login() { ... }',
      'function validate(input) { ... }',
      'const process = () => { ... }'
    ),
    explanation: fc.constantFrom(
      'Method implements login functionality',
      'Function validates user input',
      'Code handles the specified criterion'
    )
  });

  // Arbitrary for generating suggestions
  const suggestionsArb = fc.array(
    fc.constantFrom(
      'Implement error handling',
      'Add validation logic',
      'Create unit tests',
      'Handle edge cases'
    ),
    { minLength: 1, maxLength: 3 }
  );

  /**
   * Feature: tdd-assistant, Property 12: Coverage Status Mutual Exclusivity
   * Validates: Requirements 8.8, 8.9, 8.10
   * 
   * For any criterion in a validation report, the status should be exactly one of:
   * 'covered', 'partially_covered', or 'not_covered' - never multiple or none.
   */
  it('Property 12: CriterionMatch status should be exactly one valid CoverageStatus', async () => {
    const validStatuses: CoverageStatus[] = ['covered', 'partially_covered', 'not_covered'];

    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        coverageStatusArb,
        fc.array(codeEvidenceArb, { minLength: 0, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, status, evidence, confidence, suggestions) => {
          // Create a CriterionMatch based on the status
          let match: CriterionMatch;
          
          if (status === 'covered') {
            // Covered requires evidence
            const evidenceToUse = evidence.length > 0 ? evidence : [createCodeEvidence(
              'src/Service.java',
              'code snippet',
              'explanation',
              { start: 1, end: 10 }
            )];
            match = createCoveredMatch(criterion, evidenceToUse, confidence);
          } else if (status === 'partially_covered') {
            // Partially covered requires evidence and suggestions
            const evidenceToUse = evidence.length > 0 ? evidence : [createCodeEvidence(
              'src/Service.java',
              'code snippet',
              'explanation',
              { start: 1, end: 10 }
            )];
            match = createPartiallyCoveredMatch(criterion, evidenceToUse, confidence, suggestions);
          } else {
            // Not covered requires suggestions
            match = createNotCoveredMatch(criterion, suggestions);
          }

          // Property 1: Status must be exactly one of the valid statuses
          const statusIsValid = validStatuses.includes(match.status);

          // Property 2: Status must be a string (not array, object, etc.)
          const statusIsString = typeof match.status === 'string';

          // Property 3: Status count - exactly one status should match
          const statusMatchCount = validStatuses.filter(s => s === match.status).length;
          const exactlyOneStatus = statusMatchCount === 1;

          // Property 4: Status is not null or undefined
          const statusNotNullish = match.status !== null && match.status !== undefined;

          return statusIsValid && statusIsString && exactlyOneStatus && statusNotNullish;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 12: Coverage Status Mutual Exclusivity
   * Validates: Requirements 8.8, 8.9, 8.10
   * 
   * Factory functions should always produce matches with valid, mutually exclusive statuses.
   */
  it('Property 12: Factory functions should produce mutually exclusive statuses', async () => {
    const validStatuses: CoverageStatus[] = ['covered', 'partially_covered', 'not_covered'];

    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, evidence, confidence, suggestions) => {
          // Create matches using all three factory functions
          const coveredMatch = createCoveredMatch(criterion, evidence, confidence);
          const partiallyCoveredMatch = createPartiallyCoveredMatch(criterion, evidence, confidence, suggestions);
          const notCoveredMatch = createNotCoveredMatch(criterion, suggestions);

          // Property 1: Each factory produces exactly one status type
          const coveredHasCorrectStatus = coveredMatch.status === 'covered';
          const partialHasCorrectStatus = partiallyCoveredMatch.status === 'partially_covered';
          const notCoveredHasCorrectStatus = notCoveredMatch.status === 'not_covered';

          // Property 2: All statuses are valid
          const allStatusesValid = 
            validStatuses.includes(coveredMatch.status) &&
            validStatuses.includes(partiallyCoveredMatch.status) &&
            validStatuses.includes(notCoveredMatch.status);

          // Property 3: Statuses are mutually exclusive (different from each other)
          const statusesAreDifferent = 
            coveredMatch.status !== partiallyCoveredMatch.status &&
            partiallyCoveredMatch.status !== notCoveredMatch.status &&
            coveredMatch.status !== notCoveredMatch.status;

          return coveredHasCorrectStatus && partialHasCorrectStatus && 
                 notCoveredHasCorrectStatus && allStatusesValid && statusesAreDifferent;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 12: Coverage Status Mutual Exclusivity
   * Validates: Requirements 8.8, 8.9, 8.10
   * 
   * validateCriterionMatch should reject matches with invalid statuses.
   */
  it('Property 12: validateCriterionMatch should accept only valid statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, evidence, confidence, suggestions) => {
          // Create valid matches
          const coveredMatch = createCoveredMatch(criterion, evidence, confidence);
          const partiallyCoveredMatch = createPartiallyCoveredMatch(criterion, evidence, confidence, suggestions);
          const notCoveredMatch = createNotCoveredMatch(criterion, suggestions);

          // All valid matches should pass validation
          const coveredValid = validateCriterionMatch(coveredMatch);
          const partialValid = validateCriterionMatch(partiallyCoveredMatch);
          const notCoveredValid = validateCriterionMatch(notCoveredMatch);

          return coveredValid && partialValid && notCoveredValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 12: Coverage Status Mutual Exclusivity
   * Validates: Requirements 8.8, 8.9, 8.10
   * 
   * Invalid status values should be rejected by validateCriterionMatch.
   */
  it('Property 12: Invalid status values should fail validation', async () => {
    // Arbitrary for invalid status values
    const invalidStatusArb = fc.constantFrom(
      'complete', 'incomplete', 'pending', 'unknown', 'partial', 'full', ''
    );

    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        invalidStatusArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        async (criterion, invalidStatus, evidence, confidence) => {
          // Create a match with an invalid status
          const invalidMatch: CriterionMatch = {
            criterion,
            status: invalidStatus as CoverageStatus, // Force invalid status
            evidence,
            confidence
          };

          // Invalid status should fail validation
          const isValid = validateCriterionMatch(invalidMatch);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Evidence Requirement
 * 
 * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
 * Validates: Requirements 8.8, 8.9
 */
describe('Property-Based Tests: Evidence Requirement for Covered Criteria', () => {
  // Arbitrary for generating valid criterion types
  const criterionTypeArb: fc.Arbitrary<CriterionType> = fc.constantFrom(
    'happy_path', 'error', 'edge_case', 'boundary', 'functional'
  );

  // Arbitrary for generating valid criterion IDs
  const criterionIdArb = fc.integer({ min: 1, max: 100 }).map(n => `AC-${n}`);

  // Arbitrary for generating criterion descriptions
  const criterionDescriptionArb = fc.tuple(
    fc.constantFrom('User', 'System', 'Admin', 'Developer'),
    fc.constantFrom('can', 'should', 'must', 'will'),
    fc.constantFrom(
      'login with valid credentials',
      'view the dashboard',
      'create a new account',
      'update profile information',
      'delete existing records',
      'handle invalid input',
      'display error message'
    )
  ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

  // Arbitrary for generating keywords
  const keywordsArb = fc.array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 3, maxLength: 10 }),
    { minLength: 1, maxLength: 5 }
  );

  // Arbitrary for generating AcceptanceCriterion
  const acceptanceCriterionArb: fc.Arbitrary<AcceptanceCriterion> = fc.record({
    id: criterionIdArb,
    description: criterionDescriptionArb,
    type: criterionTypeArb,
    keywords: keywordsArb
  });

  // Arbitrary for generating non-empty strings for snippet and explanation
  const nonEmptyStringArb = fc.stringOf(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[];,.'),
    { minLength: 1, maxLength: 100 }
  );

  // Arbitrary for generating valid CodeEvidence with non-empty snippet and explanation
  const validCodeEvidenceArb: fc.Arbitrary<CodeEvidence> = fc.record({
    filePath: fc.constantFrom('src/main/java/Service.java', 'src/app/service.ts', 'src/index.js'),
    className: fc.option(fc.constantFrom('UserService', 'AuthService', 'DataService'), { nil: undefined }),
    methodName: fc.option(fc.constantFrom('login', 'validate', 'process', 'handle'), { nil: undefined }),
    lineNumbers: fc.record({
      start: fc.integer({ min: 1, max: 100 }),
      end: fc.integer({ min: 100, max: 200 })
    }),
    snippet: nonEmptyStringArb,
    explanation: nonEmptyStringArb
  });

  // Arbitrary for generating suggestions
  const suggestionsArb = fc.array(
    fc.constantFrom(
      'Implement error handling',
      'Add validation logic',
      'Create unit tests',
      'Handle edge cases'
    ),
    { minLength: 1, maxLength: 3 }
  );

  /**
   * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
   * Validates: Requirements 8.8, 8.9
   * 
   * For any criterion marked as 'covered' or 'partially_covered', the validation report
   * should include at least one CodeEvidence object with a non-empty snippet and explanation.
   */
  it('Property 13: Covered criteria must have at least one evidence with non-empty snippet and explanation', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.array(validCodeEvidenceArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, evidence, confidence, suggestions) => {
          // Create covered match
          const coveredMatch = createCoveredMatch(criterion, evidence, confidence);
          
          // Property: Covered match must have at least one evidence
          const hasEvidence = coveredMatch.evidence.length >= 1;
          
          // Property: At least one evidence must have non-empty snippet and explanation
          const hasValidEvidence = coveredMatch.evidence.some(
            ev => ev.snippet.trim().length > 0 && ev.explanation.trim().length > 0
          );
          
          return hasEvidence && hasValidEvidence;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
   * Validates: Requirements 8.8, 8.9
   * 
   * For any criterion marked as 'partially_covered', the validation report
   * should include at least one CodeEvidence object with a non-empty snippet and explanation.
   */
  it('Property 13: Partially covered criteria must have at least one evidence with non-empty snippet and explanation', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.array(validCodeEvidenceArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, evidence, confidence, suggestions) => {
          // Create partially covered match
          const partiallyCoveredMatch = createPartiallyCoveredMatch(criterion, evidence, confidence, suggestions);
          
          // Property: Partially covered match must have at least one evidence
          const hasEvidence = partiallyCoveredMatch.evidence.length >= 1;
          
          // Property: At least one evidence must have non-empty snippet and explanation
          const hasValidEvidence = partiallyCoveredMatch.evidence.some(
            ev => ev.snippet.trim().length > 0 && ev.explanation.trim().length > 0
          );
          
          return hasEvidence && hasValidEvidence;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
   * Validates: Requirements 8.8, 8.9
   * 
   * validateCriterionMatch should reject covered/partially_covered matches with empty evidence.
   */
  it('Property 13: validateCriterionMatch should reject covered matches with empty evidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.integer({ min: 0, max: 100 }),
        async (criterion, confidence) => {
          // Create a covered match with empty evidence array
          const invalidCoveredMatch: CriterionMatch = {
            criterion,
            status: 'covered',
            evidence: [], // Empty evidence - should be invalid
            confidence
          };
          
          // Should fail validation because covered requires evidence
          const isValid = validateCriterionMatch(invalidCoveredMatch);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
   * Validates: Requirements 8.8, 8.9
   * 
   * validateCriterionMatch should reject partially_covered matches with empty evidence.
   */
  it('Property 13: validateCriterionMatch should reject partially_covered matches with empty evidence', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, confidence, suggestions) => {
          // Create a partially covered match with empty evidence array
          const invalidPartialMatch: CriterionMatch = {
            criterion,
            status: 'partially_covered',
            evidence: [], // Empty evidence - should be invalid
            confidence,
            suggestions
          };
          
          // Should fail validation because partially_covered requires evidence
          const isValid = validateCriterionMatch(invalidPartialMatch);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 13: Evidence Requirement for Covered Criteria
   * Validates: Requirements 8.8, 8.9
   * 
   * Factory functions should always produce matches with valid evidence for covered statuses.
   */
  it('Property 13: Factory functions should produce valid evidence for covered/partially_covered', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        fc.array(validCodeEvidenceArb, { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (criterion, evidence, confidence, suggestions) => {
          // Create matches using factory functions
          const coveredMatch = createCoveredMatch(criterion, evidence, confidence);
          const partiallyCoveredMatch = createPartiallyCoveredMatch(criterion, evidence, confidence, suggestions);
          
          // Both should pass validation
          const coveredValid = validateCriterionMatch(coveredMatch);
          const partialValid = validateCriterionMatch(partiallyCoveredMatch);
          
          // Both should have evidence with non-empty snippet and explanation
          const coveredHasValidEvidence = coveredMatch.evidence.some(
            ev => ev.snippet.trim().length > 0 && ev.explanation.trim().length > 0
          );
          const partialHasValidEvidence = partiallyCoveredMatch.evidence.some(
            ev => ev.snippet.trim().length > 0 && ev.explanation.trim().length > 0
          );
          
          return coveredValid && partialValid && coveredHasValidEvidence && partialHasValidEvidence;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Suggestions Requirement
 * 
 * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
 * Validates: Requirements 8.10
 */
describe('Property-Based Tests: Suggestions Requirement for Uncovered Criteria', () => {
  // Arbitrary for generating valid criterion types
  const criterionTypeArb: fc.Arbitrary<CriterionType> = fc.constantFrom(
    'happy_path', 'error', 'edge_case', 'boundary', 'functional'
  );

  // Arbitrary for generating valid criterion IDs
  const criterionIdArb = fc.integer({ min: 1, max: 100 }).map(n => `AC-${n}`);

  // Arbitrary for generating criterion descriptions
  const criterionDescriptionArb = fc.tuple(
    fc.constantFrom('User', 'System', 'Admin', 'Developer'),
    fc.constantFrom('can', 'should', 'must', 'will'),
    fc.constantFrom(
      'login with valid credentials',
      'view the dashboard',
      'create a new account',
      'update profile information',
      'delete existing records',
      'handle invalid input',
      'display error message'
    )
  ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

  // Arbitrary for generating keywords
  const keywordsArb = fc.array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 3, maxLength: 10 }),
    { minLength: 1, maxLength: 5 }
  );

  // Arbitrary for generating AcceptanceCriterion
  const acceptanceCriterionArb: fc.Arbitrary<AcceptanceCriterion> = fc.record({
    id: criterionIdArb,
    description: criterionDescriptionArb,
    type: criterionTypeArb,
    keywords: keywordsArb
  });

  // Arbitrary for generating non-empty suggestions
  const nonEmptySuggestionArb = fc.constantFrom(
    'Implement error handling for this scenario',
    'Add validation logic for user input',
    'Create unit tests for this functionality',
    'Handle edge cases appropriately',
    'Add logging for debugging purposes',
    'Implement retry mechanism',
    'Add proper exception handling',
    'Consider adding caching for performance'
  );

  // Arbitrary for generating non-empty suggestions array
  const suggestionsArb = fc.array(nonEmptySuggestionArb, { minLength: 1, maxLength: 5 });

  /**
   * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
   * Validates: Requirements 8.10
   * 
   * For any criterion marked as 'not_covered', the validation report should include
   * at least one implementation suggestion.
   */
  it('Property 14: Not covered criteria must have at least one suggestion', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        suggestionsArb,
        async (criterion, suggestions) => {
          // Create not_covered match using factory function
          const notCoveredMatch = createNotCoveredMatch(criterion, suggestions);
          
          // Property: Not covered match must have suggestions array
          const hasSuggestions = notCoveredMatch.suggestions !== undefined && 
                                 notCoveredMatch.suggestions !== null;
          
          // Property: Suggestions array must have at least one element
          const hasAtLeastOneSuggestion = hasSuggestions && 
                                          notCoveredMatch.suggestions!.length >= 1;
          
          // Property: Each suggestion must be a non-empty string
          const allSuggestionsValid = hasSuggestions && 
                                      notCoveredMatch.suggestions!.every(
                                        s => typeof s === 'string' && s.trim().length > 0
                                      );
          
          return hasSuggestions && hasAtLeastOneSuggestion && allSuggestionsValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
   * Validates: Requirements 8.10
   * 
   * validateCriterionMatch should reject not_covered matches without suggestions.
   */
  it('Property 14: validateCriterionMatch should reject not_covered matches without suggestions', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        async (criterion) => {
          // Create a not_covered match with empty suggestions array
          const invalidMatch: CriterionMatch = {
            criterion,
            status: 'not_covered',
            evidence: [],
            confidence: 0,
            suggestions: [] // Empty suggestions - should be invalid
          };
          
          // Should fail validation because not_covered requires suggestions
          const isValid = validateCriterionMatch(invalidMatch);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
   * Validates: Requirements 8.10
   * 
   * validateCriterionMatch should reject not_covered matches with undefined suggestions.
   */
  it('Property 14: validateCriterionMatch should reject not_covered matches with undefined suggestions', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        async (criterion) => {
          // Create a not_covered match with undefined suggestions
          const invalidMatch: CriterionMatch = {
            criterion,
            status: 'not_covered',
            evidence: [],
            confidence: 0
            // suggestions is undefined - should be invalid
          };
          
          // Should fail validation because not_covered requires suggestions
          const isValid = validateCriterionMatch(invalidMatch);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
   * Validates: Requirements 8.10
   * 
   * createNotCoveredMatch factory function should always produce matches with valid suggestions.
   */
  it('Property 14: createNotCoveredMatch should always produce valid suggestions', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        suggestionsArb,
        async (criterion, suggestions) => {
          // Create not_covered match using factory function
          const notCoveredMatch = createNotCoveredMatch(criterion, suggestions);
          
          // Factory function should produce valid match
          const isValid = validateCriterionMatch(notCoveredMatch);
          
          // Status should be 'not_covered'
          const hasCorrectStatus = notCoveredMatch.status === 'not_covered';
          
          // Should have suggestions
          const hasSuggestions = notCoveredMatch.suggestions !== undefined &&
                                 notCoveredMatch.suggestions.length >= 1;
          
          // Confidence should be 0 for not_covered
          const hasZeroConfidence = notCoveredMatch.confidence === 0;
          
          // Evidence should be empty for not_covered
          const hasEmptyEvidence = notCoveredMatch.evidence.length === 0;
          
          return isValid && hasCorrectStatus && hasSuggestions && 
                 hasZeroConfidence && hasEmptyEvidence;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 14: Suggestions Requirement for Uncovered Criteria
   * Validates: Requirements 8.10
   * 
   * Suggestions should be preserved exactly as provided to the factory function.
   */
  it('Property 14: Suggestions should be preserved in the match', async () => {
    await fc.assert(
      fc.asyncProperty(
        acceptanceCriterionArb,
        suggestionsArb,
        async (criterion, suggestions) => {
          // Create not_covered match using factory function
          const notCoveredMatch = createNotCoveredMatch(criterion, suggestions);
          
          // Suggestions should match the input
          const suggestionsMatch = notCoveredMatch.suggestions !== undefined &&
                                   notCoveredMatch.suggestions.length === suggestions.length &&
                                   notCoveredMatch.suggestions.every((s, i) => s === suggestions[i]);
          
          return suggestionsMatch;
        }
      ),
      { numRuns: 100 }
    );
  });
});
