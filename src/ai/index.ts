/**
 * AI Module Exports
 * 
 * This module provides AI-powered test case extraction functionality
 */

// Main service exports
export {
  AIService,
  OpenAIService,
  OpenAIServiceConfig,
  createAIService,
  TestCase,
  TestCaseType,
  APIKeyNotConfiguredError,
  AIServiceUnavailableError,
  parseTestCasesFromResponse
} from './openai-service';

// Test case extraction utilities
export {
  extractTestCases,
  categorizeTestCases,
  checkCoverage,
  ExtractionResult,
  isValidTestCaseType,
  inferTestCaseType,
  extractAssertionsFromDescription,
  extractMockDependencies,
  sanitizeTestName,
  extractJsonFromResponse
} from './test-case-extractor';
