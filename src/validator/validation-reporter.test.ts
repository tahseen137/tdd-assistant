/**
 * Validation Reporter Tests
 * 
 * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
 * Validates: Requirements 8.7, 8.11
 */

import * as fc from 'fast-check';
import {
  calculateSummary,
  createValidationReport,
  validateReport,
  createValidationReporter
} from './validation-reporter';
import {
  AcceptanceCriterion,
  CriterionMatch,
  CoverageStatus,
  CodeEvidence,
  CriterionType,
  UserStorySummary,
  ValidationReport
} from './types';

/**
 * Property-Based Tests for Validation Report Criteria Count Consistency
 * 
 * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
 * Validates: Requirements 8.7, 8.11
 */
describe('Property-Based Tests: Validation Report Criteria Count Consistency', () => {
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

  // Arbitrary for generating a CriterionMatch based on status
  const criterionMatchArb: fc.Arbitrary<CriterionMatch> = fc.tuple(
    acceptanceCriterionArb,
    coverageStatusArb,
    fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
    fc.integer({ min: 0, max: 100 }),
    suggestionsArb
  ).map(([criterion, status, evidence, confidence, suggestions]) => {
    if (status === 'covered') {
      return {
        criterion,
        status,
        evidence,
        confidence
      };
    } else if (status === 'partially_covered') {
      return {
        criterion,
        status,
        evidence,
        confidence,
        suggestions
      };
    } else {
      return {
        criterion,
        status: 'not_covered' as CoverageStatus,
        evidence: [],
        confidence: 0,
        suggestions
      };
    }
  });

  // Arbitrary for generating UserStorySummary
  const userStorySummaryArb: fc.Arbitrary<UserStorySummary> = fc.record({
    role: fc.constantFrom('user', 'admin', 'developer', 'manager'),
    feature: fc.constantFrom(
      'login to the system',
      'manage user accounts',
      'view dashboard',
      'generate reports'
    ),
    benefit: fc.constantFrom(
      'access the application',
      'maintain security',
      'track progress',
      'make informed decisions'
    ),
    totalCriteria: fc.integer({ min: 0, max: 20 })
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * For any validation run, the sum of covered + partially_covered + not_covered criteria
   * in the report should equal the total number of extracted acceptance criteria.
   */
  it('Property 11: Sum of status counts should equal total criteria count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 20 }),
        async (criteria) => {
          // Calculate summary from criteria
          const summary = calculateSummary(criteria);
          
          // Property: covered + partiallyCovered + notCovered === totalCriteria
          const sumOfCounts = summary.covered + summary.partiallyCovered + summary.notCovered;
          const countsMatchTotal = sumOfCounts === summary.totalCriteria;
          
          // Property: totalCriteria should equal the length of criteria array
          const totalMatchesArrayLength = summary.totalCriteria === criteria.length;
          
          return countsMatchTotal && totalMatchesArrayLength;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * For any ValidationReport, the criteria array length should match summary.totalCriteria.
   */
  it('Property 11: Criteria array length should match summary totalCriteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 20 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Property: criteria array length should equal summary.totalCriteria
          const arrayLengthMatchesSummary = report.criteria.length === report.summary.totalCriteria;
          
          // Property: story.totalCriteria should also match
          const storyTotalMatches = report.story.totalCriteria === report.criteria.length;
          
          return arrayLengthMatchesSummary && storyTotalMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * validateReport should return true for reports with consistent counts.
   */
  it('Property 11: validateReport should accept reports with consistent counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 20 }),
        async (storySummary, criteria) => {
          // Create validation report using factory function
          const report = createValidationReport(storySummary, criteria);
          
          // Property: validateReport should return true for consistent reports
          const isValid = validateReport(report);
          
          return isValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * validateReport should return false for reports with inconsistent counts.
   */
  it('Property 11: validateReport should reject reports with inconsistent counts', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 10 }),
        async (storySummary, criteria, offset) => {
          // Create a valid report first
          const validReport = createValidationReport(storySummary, criteria);
          
          // Create an invalid report by manipulating the summary
          const invalidReport: ValidationReport = {
            ...validReport,
            summary: {
              ...validReport.summary,
              // Make totalCriteria inconsistent with actual counts
              totalCriteria: validReport.summary.totalCriteria + offset
            }
          };
          
          // Property: validateReport should return false for inconsistent reports
          const isValid = validateReport(invalidReport);
          
          return !isValid; // Should be invalid
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * Individual status counts should accurately reflect the criteria array.
   */
  it('Property 11: Individual status counts should match actual criteria statuses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 20 }),
        async (criteria) => {
          // Calculate summary
          const summary = calculateSummary(criteria);
          
          // Count actual statuses in criteria array
          const actualCovered = criteria.filter(c => c.status === 'covered').length;
          const actualPartiallyCovered = criteria.filter(c => c.status === 'partially_covered').length;
          const actualNotCovered = criteria.filter(c => c.status === 'not_covered').length;
          
          // Property: Summary counts should match actual counts
          const coveredMatches = summary.covered === actualCovered;
          const partialMatches = summary.partiallyCovered === actualPartiallyCovered;
          const notCoveredMatches = summary.notCovered === actualNotCovered;
          
          return coveredMatches && partialMatches && notCoveredMatches;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * Empty criteria array should result in zero counts.
   */
  it('Property 11: Empty criteria array should result in zero counts', async () => {
    // Calculate summary for empty array
    const summary = calculateSummary([]);
    
    // All counts should be zero
    expect(summary.totalCriteria).toBe(0);
    expect(summary.covered).toBe(0);
    expect(summary.partiallyCovered).toBe(0);
    expect(summary.notCovered).toBe(0);
    
    // Sum should still equal total
    const sum = summary.covered + summary.partiallyCovered + summary.notCovered;
    expect(sum).toBe(summary.totalCriteria);
  });

  /**
   * Feature: tdd-assistant, Property 11: Validation Report Criteria Count Consistency
   * Validates: Requirements 8.7, 8.11
   * 
   * All criteria with same status should result in that count equaling total.
   */
  it('Property 11: All same status should have that count equal total', async () => {
    await fc.assert(
      fc.asyncProperty(
        coverageStatusArb,
        fc.integer({ min: 1, max: 20 }),
        acceptanceCriterionArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (status, count, baseCriterion, evidence, confidence, suggestions) => {
          // Create criteria array with all same status
          const criteria: CriterionMatch[] = Array.from({ length: count }, (_, i) => {
            const criterion = { ...baseCriterion, id: `AC-${i + 1}` };
            if (status === 'covered') {
              return { criterion, status, evidence, confidence };
            } else if (status === 'partially_covered') {
              return { criterion, status, evidence, confidence, suggestions };
            } else {
              return { criterion, status: 'not_covered' as CoverageStatus, evidence: [], confidence: 0, suggestions };
            }
          });
          
          const summary = calculateSummary(criteria);
          
          // Property: The count for the given status should equal total
          let statusCountEqualsTotal = false;
          if (status === 'covered') {
            statusCountEqualsTotal = summary.covered === summary.totalCriteria;
          } else if (status === 'partially_covered') {
            statusCountEqualsTotal = summary.partiallyCovered === summary.totalCriteria;
          } else {
            statusCountEqualsTotal = summary.notCovered === summary.totalCriteria;
          }
          
          // Property: Other counts should be zero
          let otherCountsZero = false;
          if (status === 'covered') {
            otherCountsZero = summary.partiallyCovered === 0 && summary.notCovered === 0;
          } else if (status === 'partially_covered') {
            otherCountsZero = summary.covered === 0 && summary.notCovered === 0;
          } else {
            otherCountsZero = summary.covered === 0 && summary.partiallyCovered === 0;
          }
          
          return statusCountEqualsTotal && otherCountsZero;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Coverage Percentage Calculation Accuracy
 * 
 * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
 * Validates: Requirements 8.11
 */
describe('Property-Based Tests: Coverage Percentage Calculation Accuracy', () => {
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
      'delete existing records'
    )
  ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

  // Arbitrary for generating keywords
  const keywordsArb = fc.array(
    fc.string({ minLength: 3, maxLength: 10 }),
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

  // Arbitrary for generating a CriterionMatch based on status
  const criterionMatchArb: fc.Arbitrary<CriterionMatch> = fc.tuple(
    acceptanceCriterionArb,
    coverageStatusArb,
    fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
    fc.integer({ min: 0, max: 100 }),
    suggestionsArb
  ).map(([criterion, status, evidence, confidence, suggestions]) => {
    if (status === 'covered') {
      return {
        criterion,
        status,
        evidence,
        confidence
      };
    } else if (status === 'partially_covered') {
      return {
        criterion,
        status,
        evidence,
        confidence,
        suggestions
      };
    } else {
      return {
        criterion,
        status: 'not_covered' as CoverageStatus,
        evidence: [],
        confidence: 0,
        suggestions
      };
    }
  });

  /**
   * Helper function to calculate expected coverage percentage
   * Formula: (covered + 0.5 * partiallyCovered) / totalCriteria * 100, rounded to one decimal place
   */
  function calculateExpectedCoveragePercentage(
    covered: number,
    partiallyCovered: number,
    totalCriteria: number
  ): number {
    if (totalCriteria === 0) return 0;
    return Math.round(((covered + 0.5 * partiallyCovered) / totalCriteria) * 1000) / 10;
  }

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * For any validation report, the coveragePercentage should equal 
   * (covered + 0.5 * partiallyCovered) / totalCriteria * 100, rounded to one decimal place.
   */
  it('Property 15: Coverage percentage should follow the formula (covered + 0.5 * partiallyCovered) / totalCriteria * 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 20 }),
        async (criteria) => {
          // Calculate summary from criteria
          const summary = calculateSummary(criteria);
          
          // Calculate expected coverage percentage using the formula
          const expectedPercentage = calculateExpectedCoveragePercentage(
            summary.covered,
            summary.partiallyCovered,
            summary.totalCriteria
          );
          
          // Property: coveragePercentage should match the expected formula result
          return summary.coveragePercentage === expectedPercentage;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be 0 when there are no criteria.
   */
  it('Property 15: Coverage percentage should be 0 for empty criteria', () => {
    const summary = calculateSummary([]);
    expect(summary.coveragePercentage).toBe(0);
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be 100 when all criteria are covered.
   */
  it('Property 15: Coverage percentage should be 100 when all criteria are covered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        acceptanceCriterionArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        async (count, baseCriterion, evidence, confidence) => {
          // Create criteria array with all 'covered' status
          const criteria: CriterionMatch[] = Array.from({ length: count }, (_, i) => ({
            criterion: { ...baseCriterion, id: `AC-${i + 1}` },
            status: 'covered' as CoverageStatus,
            evidence,
            confidence
          }));
          
          const summary = calculateSummary(criteria);
          
          // Property: Coverage should be 100% when all are covered
          return summary.coveragePercentage === 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be 0 when all criteria are not covered.
   */
  it('Property 15: Coverage percentage should be 0 when all criteria are not covered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        acceptanceCriterionArb,
        suggestionsArb,
        async (count, baseCriterion, suggestions) => {
          // Create criteria array with all 'not_covered' status
          const criteria: CriterionMatch[] = Array.from({ length: count }, (_, i) => ({
            criterion: { ...baseCriterion, id: `AC-${i + 1}` },
            status: 'not_covered' as CoverageStatus,
            evidence: [],
            confidence: 0,
            suggestions
          }));
          
          const summary = calculateSummary(criteria);
          
          // Property: Coverage should be 0% when none are covered
          return summary.coveragePercentage === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be 50 when all criteria are partially covered.
   */
  it('Property 15: Coverage percentage should be 50 when all criteria are partially covered', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        acceptanceCriterionArb,
        fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
        fc.integer({ min: 0, max: 100 }),
        suggestionsArb,
        async (count, baseCriterion, evidence, confidence, suggestions) => {
          // Create criteria array with all 'partially_covered' status
          const criteria: CriterionMatch[] = Array.from({ length: count }, (_, i) => ({
            criterion: { ...baseCriterion, id: `AC-${i + 1}` },
            status: 'partially_covered' as CoverageStatus,
            evidence,
            confidence,
            suggestions
          }));
          
          const summary = calculateSummary(criteria);
          
          // Property: Coverage should be 50% when all are partially covered
          return summary.coveragePercentage === 50;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be between 0 and 100 inclusive.
   */
  it('Property 15: Coverage percentage should be between 0 and 100 inclusive', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 20 }),
        async (criteria) => {
          const summary = calculateSummary(criteria);
          
          // Property: Coverage percentage should be in valid range
          return summary.coveragePercentage >= 0 && summary.coveragePercentage <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Coverage percentage should be rounded to one decimal place.
   */
  it('Property 15: Coverage percentage should be rounded to one decimal place', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 20 }),
        async (criteria) => {
          const summary = calculateSummary(criteria);
          
          // Property: Coverage percentage should have at most one decimal place
          // Multiply by 10, and check if it's an integer (or very close due to floating point)
          const multiplied = summary.coveragePercentage * 10;
          const isRoundedToOneDecimal = Math.abs(multiplied - Math.round(multiplied)) < 0.0001;
          
          return isRoundedToOneDecimal;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 15: Coverage Percentage Calculation Accuracy
   * Validates: Requirements 8.11
   * 
   * Test with specific known values to verify formula correctness.
   */
  it('Property 15: Coverage percentage should match expected values for known inputs', () => {
    // Test case 1: 2 covered, 2 partially covered, 0 not covered out of 4 total
    // Expected: (2 + 0.5 * 2) / 4 * 100 = 3 / 4 * 100 = 75%
    const criteria1: CriterionMatch[] = [
      { criterion: { id: 'AC-1', description: 'Test 1', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-3', description: 'Test 3', type: 'functional', keywords: [] }, status: 'partially_covered', evidence: [], confidence: 50, suggestions: [] },
      { criterion: { id: 'AC-4', description: 'Test 4', type: 'functional', keywords: [] }, status: 'partially_covered', evidence: [], confidence: 50, suggestions: [] }
    ];
    expect(calculateSummary(criteria1).coveragePercentage).toBe(75);

    // Test case 2: 1 covered, 1 partially covered, 1 not covered out of 3 total
    // Expected: (1 + 0.5 * 1) / 3 * 100 = 1.5 / 3 * 100 = 50%
    const criteria2: CriterionMatch[] = [
      { criterion: { id: 'AC-1', description: 'Test 1', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: [] }, status: 'partially_covered', evidence: [], confidence: 50, suggestions: [] },
      { criterion: { id: 'AC-3', description: 'Test 3', type: 'functional', keywords: [] }, status: 'not_covered', evidence: [], confidence: 0, suggestions: [] }
    ];
    expect(calculateSummary(criteria2).coveragePercentage).toBe(50);

    // Test case 3: 3 covered, 0 partially covered, 1 not covered out of 4 total
    // Expected: (3 + 0.5 * 0) / 4 * 100 = 3 / 4 * 100 = 75%
    const criteria3: CriterionMatch[] = [
      { criterion: { id: 'AC-1', description: 'Test 1', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-3', description: 'Test 3', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-4', description: 'Test 4', type: 'functional', keywords: [] }, status: 'not_covered', evidence: [], confidence: 0, suggestions: [] }
    ];
    expect(calculateSummary(criteria3).coveragePercentage).toBe(75);

    // Test case 4: 1 covered, 2 partially covered, 2 not covered out of 5 total
    // Expected: (1 + 0.5 * 2) / 5 * 100 = 2 / 5 * 100 = 40%
    const criteria4: CriterionMatch[] = [
      { criterion: { id: 'AC-1', description: 'Test 1', type: 'functional', keywords: [] }, status: 'covered', evidence: [], confidence: 100 },
      { criterion: { id: 'AC-2', description: 'Test 2', type: 'functional', keywords: [] }, status: 'partially_covered', evidence: [], confidence: 50, suggestions: [] },
      { criterion: { id: 'AC-3', description: 'Test 3', type: 'functional', keywords: [] }, status: 'partially_covered', evidence: [], confidence: 50, suggestions: [] },
      { criterion: { id: 'AC-4', description: 'Test 4', type: 'functional', keywords: [] }, status: 'not_covered', evidence: [], confidence: 0, suggestions: [] },
      { criterion: { id: 'AC-5', description: 'Test 5', type: 'functional', keywords: [] }, status: 'not_covered', evidence: [], confidence: 0, suggestions: [] }
    ];
    expect(calculateSummary(criteria4).coveragePercentage).toBe(40);
  });
});

/**
 * Property-Based Tests for Report Format Output Validity
 * 
 * Feature: tdd-assistant, Property 16: Report Format Output Validity
 * Validates: Requirements 9.1, 9.2, 9.3
 */
describe('Property-Based Tests: Report Format Output Validity', () => {
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
      'delete existing records'
    )
  ).map(([subject, verb, action]) => `${subject} ${verb} ${action}`);

  // Arbitrary for generating keywords
  const keywordsArb = fc.array(
    fc.string({ minLength: 3, maxLength: 10 }),
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

  // Arbitrary for generating a CriterionMatch based on status
  const criterionMatchArb: fc.Arbitrary<CriterionMatch> = fc.tuple(
    acceptanceCriterionArb,
    coverageStatusArb,
    fc.array(codeEvidenceArb, { minLength: 1, maxLength: 3 }),
    fc.integer({ min: 0, max: 100 }),
    suggestionsArb
  ).map(([criterion, status, evidence, confidence, suggestions]) => {
    if (status === 'covered') {
      return {
        criterion,
        status,
        evidence,
        confidence
      };
    } else if (status === 'partially_covered') {
      return {
        criterion,
        status,
        evidence,
        confidence,
        suggestions
      };
    } else {
      return {
        criterion,
        status: 'not_covered' as CoverageStatus,
        evidence: [],
        confidence: 0,
        suggestions
      };
    }
  });

  // Arbitrary for generating UserStorySummary
  const userStorySummaryArb: fc.Arbitrary<UserStorySummary> = fc.record({
    role: fc.constantFrom('user', 'admin', 'developer', 'manager'),
    feature: fc.constantFrom(
      'login to the system',
      'manage user accounts',
      'view dashboard',
      'generate reports'
    ),
    benefit: fc.constantFrom(
      'access the application',
      'maintain security',
      'track progress',
      'make informed decisions'
    ),
    totalCriteria: fc.integer({ min: 0, max: 20 })
  });

  // Create reporter instance for tests
  const reporter = createValidationReporter({ colorOutput: true });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.2
   * 
   * For any validation report, JSON format output should be valid parseable JSON.
   */
  it('Property 16: JSON format should be valid parseable JSON', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 10 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Generate JSON format
          const jsonOutput = reporter.generate(report, 'json');
          
          // Property: JSON output should be parseable
          let parsed: unknown;
          try {
            parsed = JSON.parse(jsonOutput);
          } catch {
            return false; // Invalid JSON
          }
          
          // Property: Parsed JSON should have required structure
          const hasStory = typeof (parsed as Record<string, unknown>).story === 'object';
          const hasCriteria = Array.isArray((parsed as Record<string, unknown>).criteria);
          const hasSummary = typeof (parsed as Record<string, unknown>).summary === 'object';
          const hasGeneratedAt = typeof (parsed as Record<string, unknown>).generatedAt === 'string';
          
          return hasStory && hasCriteria && hasSummary && hasGeneratedAt;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.3
   * 
   * For any validation report, Markdown format should contain proper heading structure.
   */
  it('Property 16: Markdown format should contain proper heading structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 10 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Generate Markdown format
          const mdOutput = reporter.generate(report, 'markdown');
          
          // Property: Markdown should have H1 title
          const hasH1Title = mdOutput.includes('# Validation Report');
          
          // Property: Markdown should have H2 sections
          const hasStorySummaryH2 = mdOutput.includes('## Story Summary');
          const hasCoverageSummaryH2 = mdOutput.includes('## Coverage Summary');
          const hasCriteriaDetailsH2 = mdOutput.includes('## Criteria Details');
          
          // Property: Markdown should have proper structure
          const hasTable = mdOutput.includes('| Metric | Value |');
          
          return hasH1Title && hasStorySummaryH2 && hasCoverageSummaryH2 && 
                 hasCriteriaDetailsH2 && hasTable;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.1
   * 
   * For any validation report, console format should include colored status indicators.
   */
  it('Property 16: Console format should include status indicators', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 10 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Generate console format
          const consoleOutput = reporter.generate(report, 'console');
          
          // Property: Console output should have section headers
          const hasStorySection = consoleOutput.includes('STORY SUMMARY');
          const hasCoverageSection = consoleOutput.includes('COVERAGE SUMMARY');
          const hasCriteriaSection = consoleOutput.includes('CRITERIA DETAILS');
          
          // Property: Console output should have status indicators (check marks, etc.)
          const hasStatusIndicators = consoleOutput.includes('✓') || 
                                      consoleOutput.includes('◐') || 
                                      consoleOutput.includes('✗');
          
          // Property: Console output should include ANSI color codes when colorOutput is true
          const hasColorCodes = consoleOutput.includes('\x1b[');
          
          return hasStorySection && hasCoverageSection && hasCriteriaSection && 
                 hasStatusIndicators && hasColorCodes;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.1, 9.2, 9.3
   * 
   * For any validation report, all formats should include the generated timestamp.
   */
  it('Property 16: All formats should include generated timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 0, maxLength: 5 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          const isoTimestamp = report.generatedAt.toISOString();
          
          // Generate all formats
          const jsonOutput = reporter.generate(report, 'json');
          const mdOutput = reporter.generate(report, 'markdown');
          const consoleOutput = reporter.generate(report, 'console');
          
          // Property: All formats should include the timestamp
          const jsonHasTimestamp = jsonOutput.includes(isoTimestamp);
          const mdHasTimestamp = mdOutput.includes(isoTimestamp);
          const consoleHasTimestamp = consoleOutput.includes(isoTimestamp);
          
          return jsonHasTimestamp && mdHasTimestamp && consoleHasTimestamp;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.2
   * 
   * For any validation report, JSON format should preserve all criteria data.
   */
  it('Property 16: JSON format should preserve all criteria data', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 10 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Generate JSON format and parse it back
          const jsonOutput = reporter.generate(report, 'json');
          const parsed = JSON.parse(jsonOutput) as {
            criteria: Array<{ id: string; status: string; confidence: number }>;
            summary: { totalCriteria: number; covered: number; partiallyCovered: number; notCovered: number };
          };
          
          // Property: Criteria count should match
          const criteriaCountMatches = parsed.criteria.length === criteria.length;
          
          // Property: Summary counts should match
          const summaryMatches = 
            parsed.summary.totalCriteria === report.summary.totalCriteria &&
            parsed.summary.covered === report.summary.covered &&
            parsed.summary.partiallyCovered === report.summary.partiallyCovered &&
            parsed.summary.notCovered === report.summary.notCovered;
          
          // Property: Each criterion should have required fields
          const allCriteriaValid = parsed.criteria.every(c => 
            typeof c.id === 'string' &&
            typeof c.status === 'string' &&
            typeof c.confidence === 'number'
          );
          
          return criteriaCountMatches && summaryMatches && allCriteriaValid;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.3
   * 
   * For any validation report with criteria, Markdown format should have H3 headings for each criterion.
   */
  it('Property 16: Markdown format should have H3 headings for each criterion', async () => {
    await fc.assert(
      fc.asyncProperty(
        userStorySummaryArb,
        fc.array(criterionMatchArb, { minLength: 1, maxLength: 5 }),
        async (storySummary, criteria) => {
          // Create validation report
          const report = createValidationReport(storySummary, criteria);
          
          // Generate Markdown format
          const mdOutput = reporter.generate(report, 'markdown');
          
          // Property: Each criterion should have an H3 heading with its ID
          const allCriteriaHaveHeadings = criteria.every(match => 
            mdOutput.includes(`### `) && mdOutput.includes(match.criterion.id)
          );
          
          // Property: Markdown should have status emojis
          const hasStatusEmojis = mdOutput.includes('✅') || 
                                  mdOutput.includes('⚠️') || 
                                  mdOutput.includes('❌');
          
          return allCriteriaHaveHeadings && hasStatusEmojis;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: tdd-assistant, Property 16: Report Format Output Validity
   * Validates: Requirements 9.3
   * 
   * For any validation report with code evidence, Markdown format should include code blocks.
   */
  it('Property 16: Markdown format should include code blocks for evidence snippets', async () => {
    // Create a report with evidence that has snippets
    const criterion: AcceptanceCriterion = {
      id: 'AC-1',
      description: 'User can login',
      type: 'functional',
      keywords: ['login']
    };
    
    const evidence: CodeEvidence = {
      filePath: 'src/Service.java',
      className: 'AuthService',
      methodName: 'login',
      lineNumbers: { start: 10, end: 20 },
      snippet: 'public void login() { return true; }',
      explanation: 'Implements login'
    };
    
    const match: CriterionMatch = {
      criterion,
      status: 'covered',
      evidence: [evidence],
      confidence: 90
    };
    
    const storySummary: UserStorySummary = {
      role: 'user',
      feature: 'login',
      benefit: 'access system',
      totalCriteria: 1
    };
    
    const report = createValidationReport(storySummary, [match]);
    const mdOutput = reporter.generate(report, 'markdown');
    
    // Property: Markdown should have code blocks (```)
    expect(mdOutput).toContain('```');
  });
});
