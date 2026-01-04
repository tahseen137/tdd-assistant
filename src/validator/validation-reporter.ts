/**
 * Validation Reporter
 * Generates validation reports in various formats
 * 
 * Requirements: 8.7, 8.11, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { 
  ValidationReport, 
  ValidationSummary, 
  CriterionMatch, 
  UserStorySummary,
  ReportFormat
} from './types';

/**
 * Interface for the Validation Reporter
 */
export interface ValidationReporter {
  /**
   * Generate report content in the specified format
   */
  generate(report: ValidationReport, format: ReportFormat): string;
  
  /**
   * Write report to a file
   */
  writeToFile(report: ValidationReport, filePath: string, format: ReportFormat): Promise<void>;
  
  /**
   * Write report to console
   */
  writeToConsole(report: ValidationReport): void;
}

/**
 * Factory function to create a ValidationReporter instance
 * Implementation will be added in Task 6
 */
export function createValidationReporter(): ValidationReporter {
  // Placeholder - implementation in Task 6
  throw new Error('Not implemented yet');
}

/**
 * Calculate validation summary from criterion matches
 */
export function calculateSummary(criteria: CriterionMatch[]): ValidationSummary {
  const totalCriteria = criteria.length;
  const covered = criteria.filter(c => c.status === 'covered').length;
  const partiallyCovered = criteria.filter(c => c.status === 'partially_covered').length;
  const notCovered = criteria.filter(c => c.status === 'not_covered').length;
  
  // Coverage percentage: covered counts as 100%, partially_covered as 50%
  const coveragePercentage = totalCriteria > 0
    ? Math.round(((covered + 0.5 * partiallyCovered) / totalCriteria) * 1000) / 10
    : 0;
  
  // Determine overall status
  let overallStatus: 'pass' | 'partial' | 'fail';
  if (notCovered === 0 && partiallyCovered === 0) {
    overallStatus = 'pass';
  } else if (covered === 0 && partiallyCovered === 0) {
    overallStatus = 'fail';
  } else {
    overallStatus = 'partial';
  }
  
  return {
    totalCriteria,
    covered,
    partiallyCovered,
    notCovered,
    coveragePercentage,
    overallStatus
  };
}

/**
 * Create a ValidationReport from components
 */
export function createValidationReport(
  story: UserStorySummary,
  criteria: CriterionMatch[]
): ValidationReport {
  return {
    story: {
      ...story,
      totalCriteria: criteria.length
    },
    criteria,
    summary: calculateSummary(criteria),
    generatedAt: new Date()
  };
}

/**
 * Validate that a ValidationReport has consistent data
 */
export function validateReport(report: ValidationReport): boolean {
  const { summary, criteria } = report;
  
  // Check that counts add up
  const expectedTotal = summary.covered + summary.partiallyCovered + summary.notCovered;
  if (expectedTotal !== summary.totalCriteria) {
    return false;
  }
  
  // Check that criteria count matches
  if (criteria.length !== summary.totalCriteria) {
    return false;
  }
  
  // Check coverage percentage is in valid range
  if (summary.coveragePercentage < 0 || summary.coveragePercentage > 100) {
    return false;
  }
  
  return true;
}

/**
 * Get status color for console output
 */
export function getStatusColor(status: 'covered' | 'partially_covered' | 'not_covered'): string {
  switch (status) {
    case 'covered':
      return '\x1b[32m'; // Green
    case 'partially_covered':
      return '\x1b[33m'; // Yellow
    case 'not_covered':
      return '\x1b[31m'; // Red
    default:
      return '\x1b[0m';  // Reset
  }
}

/**
 * Get status emoji for markdown output
 */
export function getStatusEmoji(status: 'covered' | 'partially_covered' | 'not_covered'): string {
  switch (status) {
    case 'covered':
      return '✅';
    case 'partially_covered':
      return '⚠️';
    case 'not_covered':
      return '❌';
    default:
      return '❓';
  }
}

/**
 * Format coverage percentage for display
 */
export function formatCoveragePercentage(percentage: number): string {
  return `${percentage.toFixed(1)}%`;
}
