/**
 * Validator Types
 * TypeScript interfaces for all validator components
 * 
 * Requirements: 8.1, 8.4, 8.7
 */

// ============================================================================
// Code Analyzer Types
// ============================================================================

/**
 * Supported source file languages
 */
export type SourceLanguage = 'java' | 'typescript' | 'javascript';

/**
 * Represents a source code file
 */
export interface SourceFile {
  path: string;
  content: string;
  language: SourceLanguage;
}

/**
 * Information about a method in the source code
 */
export interface MethodInfo {
  name: string;
  parameters: string[];
  returnType: string;
  body: string;
  annotations: string[];
  lineStart: number;
  lineEnd: number;
}

/**
 * Information about a class in the source code
 */
export interface ClassInfo {
  name: string;
  methods: MethodInfo[];
  fields: string[];
  annotations: string[];
  lineStart: number;
  lineEnd: number;
}

/**
 * Extracted structure from source code
 */
export interface CodeStructure {
  filePath: string;
  language: SourceLanguage;
  classes: ClassInfo[];
  methods: MethodInfo[];
  imports: string[];
  annotations: string[];
}

// ============================================================================
// Criteria Extractor Types
// ============================================================================

/**
 * Types of acceptance criteria
 */
export type CriterionType = 'happy_path' | 'error' | 'edge_case' | 'boundary' | 'functional';

/**
 * Represents a single acceptance criterion extracted from a user story
 */
export interface AcceptanceCriterion {
  id: string;                    // "AC-1", "AC-2", etc.
  description: string;           // The criterion text
  type: CriterionType;           // Category of the criterion
  keywords: string[];            // Key terms for matching
}

// ============================================================================
// Criteria Matcher Types
// ============================================================================

/**
 * Coverage status for a criterion
 */
export type CoverageStatus = 'covered' | 'partially_covered' | 'not_covered';

/**
 * Evidence from code that supports a criterion match
 */
export interface CodeEvidence {
  filePath: string;
  className?: string;
  methodName?: string;
  lineNumbers: { start: number; end: number };
  snippet: string;
  explanation: string;
}

/**
 * Result of matching a criterion to code
 */
export interface CriterionMatch {
  criterion: AcceptanceCriterion;
  status: CoverageStatus;
  evidence: CodeEvidence[];
  confidence: number;            // 0-100 confidence score
  suggestions?: string[];        // Suggestions if not fully covered
}

// ============================================================================
// Validation Reporter Types
// ============================================================================

/**
 * Summary of the user story
 */
export interface UserStorySummary {
  role: string;
  feature: string;
  benefit: string;
  totalCriteria: number;
}

/**
 * Summary statistics for validation
 */
export interface ValidationSummary {
  totalCriteria: number;
  covered: number;
  partiallyCovered: number;
  notCovered: number;
  coveragePercentage: number;
  overallStatus: 'pass' | 'partial' | 'fail';
}

/**
 * Complete validation report
 */
export interface ValidationReport {
  story: UserStorySummary;
  criteria: CriterionMatch[];
  summary: ValidationSummary;
  generatedAt: Date;
}

/**
 * Supported report output formats
 */
export type ReportFormat = 'console' | 'json' | 'markdown';

// ============================================================================
// CLI Types
// ============================================================================

/**
 * CLI options for the validate command
 */
export interface ValidateCLIOptions {
  story?: string;
  file?: string;
  code: string;                     // Required: path to code file or directory
  recursive?: boolean;              // Scan directory recursively
  format?: ReportFormat;
  output?: string;                  // Output file path for report
  interactive?: boolean;
  config?: string;
  model?: string;
}
