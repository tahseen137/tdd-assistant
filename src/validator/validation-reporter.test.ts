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
  validateReport
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
