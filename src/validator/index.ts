/**
 * Validator Module
 * Exports all validator components for story validation feature
 * 
 * Requirements: 8.1, 8.4, 8.7
 */

// Types
export * from './types';

// Code Analyzer
export { 
  CodeAnalyzer,
  createCodeAnalyzer,
  detectLanguage,
  isSupportedSourceFile,
  SUPPORTED_EXTENSIONS
} from './code-analyzer';

// Criteria Extractor
export {
  CriteriaExtractor,
  CriteriaExtractorConfig,
  createCriteriaExtractor,
  generateCriterionId,
  inferCriterionType,
  extractKeywords
} from './criteria-extractor';

// Criteria Matcher
export {
  CriteriaMatcher,
  CriteriaMatcherConfig,
  createCriteriaMatcher,
  createCoveredMatch,
  createPartiallyCoveredMatch,
  createNotCoveredMatch,
  createCodeEvidence,
  validateCriterionMatch
} from './criteria-matcher';

// Validation Reporter
export {
  ValidationReporter,
  createValidationReporter,
  calculateSummary,
  createValidationReport,
  validateReport,
  getStatusColor,
  getStatusEmoji,
  formatCoveragePercentage
} from './validation-reporter';
