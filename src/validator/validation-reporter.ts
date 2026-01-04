/**
 * Validation Reporter
 * Generates validation reports in various formats
 * 
 * Requirements: 8.7, 8.11, 9.1, 9.2, 9.3, 9.4, 9.5
 */

import * as fs from 'fs';
import * as path from 'path';
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
 * Configuration for ValidationReporter
 */
export interface ValidationReporterConfig {
  colorOutput?: boolean;
}

/**
 * Factory function to create a ValidationReporter instance
 * Requirement: 8.7, 9.1, 9.2, 9.3, 9.4
 */
export function createValidationReporter(config?: ValidationReporterConfig): ValidationReporter {
  return new DefaultValidationReporter(config);
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

/**
 * ANSI color codes
 */
const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m'
};

/**
 * Default implementation of ValidationReporter
 */
class DefaultValidationReporter implements ValidationReporter {
  private config: ValidationReporterConfig;

  constructor(config: ValidationReporterConfig = {}) {
    this.config = {
      colorOutput: true,
      ...config
    };
  }

  /**
   * Generate report content in the specified format
   * Requirements: 9.1, 9.2, 9.3
   */
  generate(report: ValidationReport, format: ReportFormat): string {
    switch (format) {
      case 'console':
        return this.generateConsoleFormat(report);
      case 'json':
        return this.generateJsonFormat(report);
      case 'markdown':
        return this.generateMarkdownFormat(report);
      default:
        return this.generateConsoleFormat(report);
    }
  }

  /**
   * Write report to a file
   * Requirement: 9.4
   */
  async writeToFile(
    report: ValidationReport, 
    filePath: string, 
    format: ReportFormat
  ): Promise<void> {
    const content = this.generate(report, format);
    const dirPath = path.dirname(filePath);
    
    // Create directories if they don't exist
    await fs.promises.mkdir(dirPath, { recursive: true });
    
    // Write the file
    await fs.promises.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Write report to console
   * Requirement: 9.1
   */
  writeToConsole(report: ValidationReport): void {
    const content = this.generateConsoleFormat(report);
    console.log(content);
  }

  /**
   * Generate console format output with colors
   * Requirement: 9.1, 9.5
   */
  private generateConsoleFormat(report: ValidationReport): string {
    const lines: string[] = [];
    const useColor = this.config.colorOutput;
    
    // Helper for colored text
    const color = (text: string, colorCode: string) => 
      useColor ? `${colorCode}${text}${COLORS.reset}` : text;
    
    // Header
    lines.push('');
    lines.push(color('═══════════════════════════════════════════════════════════════', COLORS.cyan));
    lines.push(color('                    VALIDATION REPORT', COLORS.bold));
    lines.push(color('═══════════════════════════════════════════════════════════════', COLORS.cyan));
    lines.push('');
    
    // Story Summary
    lines.push(color('📖 STORY SUMMARY', COLORS.bold));
    lines.push(color('───────────────────────────────────────────────────────────────', COLORS.dim));
    lines.push(`  Role:    ${report.story.role}`);
    lines.push(`  Feature: ${report.story.feature}`);
    lines.push(`  Benefit: ${report.story.benefit}`);
    lines.push('');
    
    // Coverage Summary
    lines.push(color('📊 COVERAGE SUMMARY', COLORS.bold));
    lines.push(color('───────────────────────────────────────────────────────────────', COLORS.dim));
    
    const statusColor = report.summary.overallStatus === 'pass' ? COLORS.green :
                        report.summary.overallStatus === 'partial' ? COLORS.yellow : COLORS.red;
    const statusText = report.summary.overallStatus.toUpperCase();
    
    lines.push(`  Overall Status: ${color(statusText, statusColor)}`);
    lines.push(`  Coverage:       ${color(formatCoveragePercentage(report.summary.coveragePercentage), statusColor)}`);
    lines.push('');
    lines.push(`  ${color('✓', COLORS.green)} Covered:          ${report.summary.covered}`);
    lines.push(`  ${color('◐', COLORS.yellow)} Partially Covered: ${report.summary.partiallyCovered}`);
    lines.push(`  ${color('✗', COLORS.red)} Not Covered:       ${report.summary.notCovered}`);
    lines.push(`  Total Criteria:    ${report.summary.totalCriteria}`);
    lines.push('');
    
    // Criteria Details
    lines.push(color('📋 CRITERIA DETAILS', COLORS.bold));
    lines.push(color('───────────────────────────────────────────────────────────────', COLORS.dim));
    
    for (const match of report.criteria) {
      const criterionColor = getStatusColor(match.status);
      const statusIcon = match.status === 'covered' ? '✓' :
                         match.status === 'partially_covered' ? '◐' : '✗';
      
      lines.push('');
      lines.push(`  ${color(statusIcon, criterionColor)} ${color(match.criterion.id, COLORS.bold)}: ${match.criterion.description}`);
      lines.push(`    Status: ${color(match.status.replace('_', ' '), criterionColor)} (${match.confidence}% confidence)`);
      lines.push(`    Type: ${match.criterion.type}`);
      
      // Evidence
      if (match.evidence.length > 0) {
        lines.push(`    ${color('Evidence:', COLORS.dim)}`);
        for (const ev of match.evidence) {
          if (ev.methodName) {
            lines.push(`      • ${ev.className ? ev.className + '.' : ''}${ev.methodName}`);
          }
          if (ev.explanation) {
            lines.push(`        ${color(ev.explanation, COLORS.dim)}`);
          }
          if (ev.snippet && ev.snippet.length < 100) {
            lines.push(`        ${color(`"${ev.snippet.trim()}"`, COLORS.dim)}`);
          }
        }
      }
      
      // Suggestions
      if (match.suggestions && match.suggestions.length > 0) {
        lines.push(`    ${color('Suggestions:', COLORS.yellow)}`);
        for (const suggestion of match.suggestions) {
          lines.push(`      → ${suggestion}`);
        }
      }
    }
    
    lines.push('');
    
    // Recommendations
    if (report.summary.notCovered > 0 || report.summary.partiallyCovered > 0) {
      lines.push(color('💡 RECOMMENDATIONS', COLORS.bold));
      lines.push(color('───────────────────────────────────────────────────────────────', COLORS.dim));
      
      if (report.summary.notCovered > 0) {
        lines.push(`  • ${report.summary.notCovered} criteria need implementation`);
      }
      if (report.summary.partiallyCovered > 0) {
        lines.push(`  • ${report.summary.partiallyCovered} criteria need completion`);
      }
      lines.push('  • Review the suggestions above for each criterion');
      lines.push('');
    }
    
    // Footer
    lines.push(color('───────────────────────────────────────────────────────────────', COLORS.dim));
    lines.push(`  Generated: ${report.generatedAt.toISOString()}`);
    lines.push(color('═══════════════════════════════════════════════════════════════', COLORS.cyan));
    lines.push('');
    
    return lines.join('\n');
  }

  /**
   * Generate JSON format output
   * Requirement: 9.2
   */
  private generateJsonFormat(report: ValidationReport): string {
    const jsonReport = {
      story: {
        role: report.story.role,
        feature: report.story.feature,
        benefit: report.story.benefit,
        totalCriteria: report.story.totalCriteria
      },
      criteria: report.criteria.map(match => ({
        id: match.criterion.id,
        description: match.criterion.description,
        type: match.criterion.type,
        status: match.status,
        confidence: match.confidence,
        evidence: match.evidence.map(ev => ({
          filePath: ev.filePath,
          className: ev.className,
          methodName: ev.methodName,
          lineNumbers: ev.lineNumbers,
          snippet: ev.snippet,
          explanation: ev.explanation
        })),
        suggestions: match.suggestions
      })),
      summary: {
        totalCriteria: report.summary.totalCriteria,
        covered: report.summary.covered,
        partiallyCovered: report.summary.partiallyCovered,
        notCovered: report.summary.notCovered,
        coveragePercentage: report.summary.coveragePercentage,
        overallStatus: report.summary.overallStatus
      },
      generatedAt: report.generatedAt.toISOString()
    };
    
    return JSON.stringify(jsonReport, null, 2);
  }

  /**
   * Generate Markdown format output
   * Requirement: 9.3
   */
  private generateMarkdownFormat(report: ValidationReport): string {
    const lines: string[] = [];
    
    // Title
    lines.push('# Validation Report');
    lines.push('');
    
    // Story Summary
    lines.push('## Story Summary');
    lines.push('');
    lines.push(`**Role:** ${report.story.role}`);
    lines.push('');
    lines.push(`**Feature:** ${report.story.feature}`);
    lines.push('');
    lines.push(`**Benefit:** ${report.story.benefit}`);
    lines.push('');
    
    // Coverage Summary
    lines.push('## Coverage Summary');
    lines.push('');
    
    const statusBadge = report.summary.overallStatus === 'pass' ? '🟢 PASS' :
                        report.summary.overallStatus === 'partial' ? '🟡 PARTIAL' : '🔴 FAIL';
    
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Overall Status | ${statusBadge} |`);
    lines.push(`| Coverage | ${formatCoveragePercentage(report.summary.coveragePercentage)} |`);
    lines.push(`| ✅ Covered | ${report.summary.covered} |`);
    lines.push(`| ⚠️ Partially Covered | ${report.summary.partiallyCovered} |`);
    lines.push(`| ❌ Not Covered | ${report.summary.notCovered} |`);
    lines.push(`| Total Criteria | ${report.summary.totalCriteria} |`);
    lines.push('');
    
    // Criteria Details
    lines.push('## Criteria Details');
    lines.push('');
    
    for (const match of report.criteria) {
      const emoji = getStatusEmoji(match.status);
      
      lines.push(`### ${emoji} ${match.criterion.id}: ${match.criterion.description}`);
      lines.push('');
      lines.push(`- **Status:** ${match.status.replace('_', ' ')}`);
      lines.push(`- **Confidence:** ${match.confidence}%`);
      lines.push(`- **Type:** ${match.criterion.type}`);
      lines.push('');
      
      // Evidence
      if (match.evidence.length > 0) {
        lines.push('**Evidence:**');
        lines.push('');
        for (const ev of match.evidence) {
          if (ev.methodName) {
            lines.push(`- \`${ev.className ? ev.className + '.' : ''}${ev.methodName}\``);
          }
          if (ev.explanation) {
            lines.push(`  - ${ev.explanation}`);
          }
          if (ev.snippet) {
            lines.push('');
            lines.push('```');
            lines.push(ev.snippet.trim().slice(0, 200));
            lines.push('```');
            lines.push('');
          }
        }
      }
      
      // Suggestions
      if (match.suggestions && match.suggestions.length > 0) {
        lines.push('**Suggestions:**');
        lines.push('');
        for (const suggestion of match.suggestions) {
          lines.push(`- ${suggestion}`);
        }
        lines.push('');
      }
    }
    
    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Generated: ${report.generatedAt.toISOString()}*`);
    
    return lines.join('\n');
  }
}
