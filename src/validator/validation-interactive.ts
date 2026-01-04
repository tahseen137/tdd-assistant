/**
 * Validation Interactive Mode
 * Handles interactive review of validation results
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import * as readline from 'readline';
import { 
  ValidationReport, 
  CriterionMatch, 
  CoverageStatus
} from './types';
import { 
  getStatusColor, 
  formatCoveragePercentage
} from './validation-reporter';

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
  white: '\x1b[37m'
};

/**
 * Interactive validation state
 */
export interface InteractiveValidationState {
  report: ValidationReport;
  manuallyVerified: Set<string>;
  currentIndex: number;
  modified: boolean;
}

/**
 * Result of interactive validation session
 */
export interface InteractiveValidationResult {
  report: ValidationReport;
  saved: boolean;
  cancelled: boolean;
}

/**
 * Interface for validation interactive session
 */
export interface ValidationInteractiveSession {
  /**
   * Start interactive review of validation results
   */
  review(report: ValidationReport): Promise<InteractiveValidationResult>;
  
  /**
   * Close the session
   */
  close(): void;
}

/**
 * Creates a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompts user for input and returns the response
 */
async function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Format a criterion for display
 * Requirement: 10.1
 */
export function formatCriterionDisplay(
  match: CriterionMatch, 
  index: number,
  isManuallyVerified: boolean
): string {
  const lines: string[] = [];
  const statusColor = getStatusColor(match.status);
  const verifiedMark = isManuallyVerified ? ' [MANUALLY VERIFIED]' : '';
  
  lines.push(`${COLORS.bold}${index + 1}. ${match.criterion.id}${COLORS.reset}${verifiedMark}`);
  lines.push(`   ${match.criterion.description}`);
  lines.push(`   ${statusColor}Status: ${match.status.replace('_', ' ')}${COLORS.reset} (${match.confidence}% confidence)`);
  lines.push(`   Type: ${match.criterion.type}`);
  
  return lines.join('\n');
}

/**
 * Display summary of validation results
 * Requirement: 10.1
 */
export function displayValidationSummary(state: InteractiveValidationState): void {
  const { report, manuallyVerified } = state;
  
  console.log('\n' + COLORS.cyan + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.bold + '                 INTERACTIVE VALIDATION REVIEW' + COLORS.reset);
  console.log(COLORS.cyan + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  
  console.log('\n' + COLORS.bold + '📖 STORY' + COLORS.reset);
  console.log(`   ${report.story.feature}`);
  
  console.log('\n' + COLORS.bold + '📊 COVERAGE' + COLORS.reset);
  console.log(`   ${formatCoveragePercentage(report.summary.coveragePercentage)} (${report.summary.covered}/${report.summary.totalCriteria} covered)`);
  if (manuallyVerified.size > 0) {
    console.log(`   ${COLORS.green}${manuallyVerified.size} manually verified${COLORS.reset}`);
  }
  
  console.log('\n' + COLORS.bold + '📋 CRITERIA' + COLORS.reset);
  console.log(COLORS.dim + '───────────────────────────────────────────────────────────────' + COLORS.reset);
  
  for (let i = 0; i < report.criteria.length; i++) {
    const match = report.criteria[i];
    const isVerified = manuallyVerified.has(match.criterion.id);
    console.log(formatCriterionDisplay(match, i, isVerified));
    console.log('');
  }
  
  console.log(COLORS.dim + '───────────────────────────────────────────────────────────────' + COLORS.reset);
  console.log(COLORS.bold + 'Commands:' + COLORS.reset);
  console.log('  view <n>    - View details for criterion N');
  console.log('  verify <n>  - Mark criterion N as manually verified');
  console.log('  unverify <n>- Remove manual verification from criterion N');
  console.log('  save        - Save and exit');
  console.log('  cancel      - Exit without saving');
  console.log('');
}

/**
 * Display detailed view of a criterion
 * Requirement: 10.2, 10.3
 */
export function displayCriterionDetails(
  match: CriterionMatch,
  isManuallyVerified: boolean
): void {
  const statusColor = getStatusColor(match.status);
  
  console.log('\n' + COLORS.cyan + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  console.log(COLORS.bold + `CRITERION: ${match.criterion.id}` + COLORS.reset);
  if (isManuallyVerified) {
    console.log(COLORS.green + '[MANUALLY VERIFIED]' + COLORS.reset);
  }
  console.log(COLORS.cyan + '═══════════════════════════════════════════════════════════════' + COLORS.reset);
  
  console.log('\n' + COLORS.bold + 'Description:' + COLORS.reset);
  console.log(`  ${match.criterion.description}`);
  
  console.log('\n' + COLORS.bold + 'Status:' + COLORS.reset);
  console.log(`  ${statusColor}${match.status.replace('_', ' ')}${COLORS.reset}`);
  console.log(`  Confidence: ${match.confidence}%`);
  console.log(`  Type: ${match.criterion.type}`);
  
  console.log('\n' + COLORS.bold + 'Keywords:' + COLORS.reset);
  console.log(`  ${match.criterion.keywords.join(', ')}`);
  
  // Show evidence
  if (match.evidence.length > 0) {
    console.log('\n' + COLORS.bold + 'Evidence:' + COLORS.reset);
    for (const ev of match.evidence) {
      console.log(COLORS.dim + '  ─────────────────────────────────────────────────────────' + COLORS.reset);
      if (ev.className || ev.methodName) {
        console.log(`  ${COLORS.cyan}${ev.className ? ev.className + '.' : ''}${ev.methodName || ''}${COLORS.reset}`);
      }
      console.log(`  File: ${ev.filePath}`);
      if (ev.lineNumbers.start > 0) {
        console.log(`  Lines: ${ev.lineNumbers.start}-${ev.lineNumbers.end}`);
      }
      console.log(`  ${COLORS.dim}${ev.explanation}${COLORS.reset}`);
      if (ev.snippet) {
        console.log('\n  ' + COLORS.dim + 'Code snippet:' + COLORS.reset);
        const snippetLines = ev.snippet.trim().split('\n').slice(0, 10);
        for (const line of snippetLines) {
          console.log(`    ${line}`);
        }
        if (ev.snippet.split('\n').length > 10) {
          console.log('    ...');
        }
      }
    }
  }
  
  // Show suggestions
  if (match.suggestions && match.suggestions.length > 0) {
    console.log('\n' + COLORS.bold + COLORS.yellow + 'Suggestions:' + COLORS.reset);
    for (const suggestion of match.suggestions) {
      console.log(`  → ${suggestion}`);
    }
  }
  
  console.log('\n' + COLORS.dim + 'Press Enter to return to summary...' + COLORS.reset);
}

/**
 * Parse view command and return criterion index
 */
export function parseViewCommand(input: string, maxIndex: number): number {
  const match = input.match(/^view\s+(\d+)$/i);
  if (!match) return -1;
  
  const index = parseInt(match[1], 10) - 1;
  if (index < 0 || index >= maxIndex) return -1;
  
  return index;
}

/**
 * Parse verify command and return criterion index
 */
export function parseVerifyCommand(input: string, maxIndex: number): number {
  const match = input.match(/^verify\s+(\d+)$/i);
  if (!match) return -1;
  
  const index = parseInt(match[1], 10) - 1;
  if (index < 0 || index >= maxIndex) return -1;
  
  return index;
}

/**
 * Parse unverify command and return criterion index
 */
export function parseUnverifyCommand(input: string, maxIndex: number): number {
  const match = input.match(/^unverify\s+(\d+)$/i);
  if (!match) return -1;
  
  const index = parseInt(match[1], 10) - 1;
  if (index < 0 || index >= maxIndex) return -1;
  
  return index;
}

/**
 * Update report with manual verifications
 * Requirement: 10.4
 */
export function applyManualVerifications(
  report: ValidationReport,
  manuallyVerified: Set<string>
): ValidationReport {
  const updatedCriteria = report.criteria.map(match => {
    if (manuallyVerified.has(match.criterion.id) && match.status !== 'covered') {
      return {
        ...match,
        status: 'covered' as CoverageStatus,
        confidence: 100,
        evidence: [
          ...match.evidence,
          {
            filePath: 'manual',
            lineNumbers: { start: 0, end: 0 },
            snippet: '',
            explanation: 'Manually verified by user'
          }
        ]
      };
    }
    return match;
  });
  
  // Recalculate summary
  const covered = updatedCriteria.filter(c => c.status === 'covered').length;
  const partiallyCovered = updatedCriteria.filter(c => c.status === 'partially_covered').length;
  const notCovered = updatedCriteria.filter(c => c.status === 'not_covered').length;
  const totalCriteria = updatedCriteria.length;
  
  const coveragePercentage = totalCriteria > 0
    ? Math.round(((covered + 0.5 * partiallyCovered) / totalCriteria) * 1000) / 10
    : 0;
  
  let overallStatus: 'pass' | 'partial' | 'fail';
  if (notCovered === 0 && partiallyCovered === 0) {
    overallStatus = 'pass';
  } else if (covered === 0 && partiallyCovered === 0) {
    overallStatus = 'fail';
  } else {
    overallStatus = 'partial';
  }
  
  return {
    ...report,
    criteria: updatedCriteria,
    summary: {
      totalCriteria,
      covered,
      partiallyCovered,
      notCovered,
      coveragePercentage,
      overallStatus
    }
  };
}


/**
 * Implementation of ValidationInteractiveSession
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export class ValidationInteractiveSessionImpl implements ValidationInteractiveSession {
  private rl: readline.Interface | null = null;
  
  /**
   * Creates a readline interface for user input
   */
  private createReadlineInterface(): readline.Interface {
    return readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  
  /**
   * Prompts user for input and returns the response
   */
  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.rl) {
        resolve('');
        return;
      }
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }
  
  /**
   * Start interactive review of validation results
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   */
  async review(report: ValidationReport): Promise<InteractiveValidationResult> {
    this.rl = this.createReadlineInterface();
    
    const state: InteractiveValidationState = {
      report,
      manuallyVerified: new Set<string>(),
      currentIndex: 0,
      modified: false
    };
    
    try {
      // Initial display
      displayValidationSummary(state);
      
      // Main interaction loop
      while (true) {
        const input = await this.prompt('Enter command: ');
        const command = input.toLowerCase();
        
        // Save command - Requirement: 10.5
        if (command === 'save') {
          const finalReport = applyManualVerifications(state.report, state.manuallyVerified);
          console.log('\nValidation state saved.\n');
          return { report: finalReport, saved: true, cancelled: false };
        }
        
        // Cancel command
        if (command === 'cancel') {
          console.log('\nExiting without saving.\n');
          return { report: state.report, saved: false, cancelled: true };
        }
        
        // View command - Requirement: 10.2, 10.3
        const viewIndex = parseViewCommand(input, state.report.criteria.length);
        if (viewIndex >= 0) {
          const match = state.report.criteria[viewIndex];
          const isVerified = state.manuallyVerified.has(match.criterion.id);
          displayCriterionDetails(match, isVerified);
          await this.prompt('');
          displayValidationSummary(state);
          continue;
        }
        
        // Verify command - Requirement: 10.4
        const verifyIndex = parseVerifyCommand(input, state.report.criteria.length);
        if (verifyIndex >= 0) {
          const match = state.report.criteria[verifyIndex];
          state.manuallyVerified.add(match.criterion.id);
          state.modified = true;
          console.log(`\nCriterion ${verifyIndex + 1} marked as manually verified.\n`);
          displayValidationSummary(state);
          continue;
        }
        
        // Unverify command - Requirement: 10.4
        const unverifyIndex = parseUnverifyCommand(input, state.report.criteria.length);
        if (unverifyIndex >= 0) {
          const match = state.report.criteria[unverifyIndex];
          state.manuallyVerified.delete(match.criterion.id);
          state.modified = true;
          console.log(`\nManual verification removed from criterion ${unverifyIndex + 1}.\n`);
          displayValidationSummary(state);
          continue;
        }
        
        // Unknown command
        console.log('\nUnknown command. Available commands: view <n>, verify <n>, unverify <n>, save, cancel\n');
      }
    } finally {
      this.close();
    }
  }
  
  /**
   * Close the session
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }
}

/**
 * Factory function to create a ValidationInteractiveSession
 */
export function createValidationInteractiveSession(): ValidationInteractiveSession {
  return new ValidationInteractiveSessionImpl();
}
