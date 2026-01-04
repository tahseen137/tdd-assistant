/**
 * Test Case Extractor
 * Parses AI responses into TestCase objects with proper categorization
 * 
 * Requirements: 2.2, 2.4, 5.5
 */

import { TestCase, TestCaseType } from './openai-service';

/**
 * Raw test case data from AI response (before validation)
 */
interface RawTestCase {
  name?: unknown;
  description?: unknown;
  type?: unknown;
  assertions?: unknown;
  mockDependencies?: unknown;
}

/**
 * Result of test case extraction
 */
export interface ExtractionResult {
  testCases: TestCase[];
  warnings: string[];
}

/**
 * Validates if a value is a valid TestCaseType
 */
export function isValidTestCaseType(value: unknown): value is TestCaseType {
  return value === 'happy_path' || value === 'error' || value === 'edge_case' || value === 'boundary';
}

/**
 * Infer test case type from name or description
 * Requirement: 5.5
 */
export function inferTestCaseType(name: string, description: string): TestCaseType {
  const combined = `${name} ${description}`.toLowerCase();
  
  // Check for error indicators
  const errorPatterns = [
    'error', 'exception', 'fail', 'invalid', 'unauthorized', 'forbidden',
    'not found', 'notfound', 'reject', 'throw', 'denied', 'missing'
  ];
  if (errorPatterns.some(pattern => combined.includes(pattern))) {
    return 'error';
  }
  
  // Check for edge case indicators
  const edgeCasePatterns = [
    'edge', 'empty', 'null', 'undefined', 'blank', 'whitespace',
    'special character', 'unicode', 'long', 'short', 'duplicate'
  ];
  if (edgeCasePatterns.some(pattern => combined.includes(pattern))) {
    return 'edge_case';
  }
  
  // Check for boundary indicators
  const boundaryPatterns = [
    'boundary', 'limit', 'max', 'min', 'zero', 'negative', 'overflow',
    'underflow', 'threshold', 'range', 'extreme'
  ];
  if (boundaryPatterns.some(pattern => combined.includes(pattern))) {
    return 'boundary';
  }
  
  // Default to happy path
  return 'happy_path';
}

/**
 * Extract assertions from description if not provided
 */
export function extractAssertionsFromDescription(description: string): string[] {
  const assertions: string[] = [];
  
  // Look for common assertion patterns in description
  const patterns = [
    /should\s+(.+?)(?:\.|$)/gi,
    /verify\s+(?:that\s+)?(.+?)(?:\.|$)/gi,
    /expect\s+(.+?)(?:\.|$)/gi,
    /assert\s+(?:that\s+)?(.+?)(?:\.|$)/gi,
    /returns?\s+(.+?)(?:\.|$)/gi
  ];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(description)) !== null) {
      const assertion = match[1].trim();
      if (assertion && !assertions.includes(assertion)) {
        assertions.push(assertion);
      }
    }
  }
  
  return assertions;
}

/**
 * Extract mock dependencies from description or assertions
 */
export function extractMockDependencies(
  description: string, 
  assertions: string[]
): string[] {
  const dependencies: string[] = [];
  const combined = `${description} ${assertions.join(' ')}`;
  
  // Common Spring Boot service/repository patterns
  const servicePatterns = [
    /(\w+Service)/g,
    /(\w+Repository)/g,
    /(\w+Client)/g,
    /(\w+Gateway)/g,
    /(\w+Provider)/g,
    /(\w+Adapter)/g
  ];
  
  for (const pattern of servicePatterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      const dep = match[1];
      if (!dependencies.includes(dep)) {
        dependencies.push(dep);
      }
    }
  }
  
  return dependencies;
}


/**
 * Sanitize a test case name to be a valid Java method name
 */
export function sanitizeTestName(name: string): string {
  // Remove any non-alphanumeric characters except underscores
  let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '');
  
  // Remove leading underscores and numbers
  sanitized = sanitized.replace(/^[_0-9]+/, '');
  
  // Ensure it starts with a lowercase letter
  if (sanitized.length > 0 && /[A-Z]/.test(sanitized[0])) {
    sanitized = sanitized[0].toLowerCase() + sanitized.slice(1);
  }
  
  // If empty or starts with a number or underscore, prefix with 'test'
  if (!sanitized || /^[0-9_]/.test(sanitized)) {
    sanitized = 'test' + sanitized;
  }
  
  return sanitized;
}

/**
 * Parse a single raw test case into a validated TestCase
 */
function parseRawTestCase(raw: RawTestCase, index: number): { testCase: TestCase; warnings: string[] } {
  const warnings: string[] = [];
  
  // Parse name
  let name = typeof raw.name === 'string' ? raw.name : '';
  if (!name) {
    name = `testCase${index + 1}`;
    warnings.push(`Test case ${index + 1}: Missing name, using default`);
  }
  name = sanitizeTestName(name);
  
  // Parse description
  const description = typeof raw.description === 'string' ? raw.description : '';
  if (!description) {
    warnings.push(`Test case ${index + 1}: Missing description`);
  }
  
  // Parse type
  let type: TestCaseType;
  if (isValidTestCaseType(raw.type)) {
    type = raw.type;
  } else {
    type = inferTestCaseType(name, description);
    if (raw.type) {
      warnings.push(`Test case ${index + 1}: Invalid type "${raw.type}", inferred as "${type}"`);
    }
  }
  
  // Parse assertions
  let assertions: string[] = [];
  if (Array.isArray(raw.assertions)) {
    assertions = raw.assertions.filter((a): a is string => typeof a === 'string');
  }
  if (assertions.length === 0 && description) {
    assertions = extractAssertionsFromDescription(description);
  }
  
  // Parse mock dependencies
  let mockDependencies: string[] = [];
  if (Array.isArray(raw.mockDependencies)) {
    mockDependencies = raw.mockDependencies.filter((d): d is string => typeof d === 'string');
  }
  if (mockDependencies.length === 0) {
    mockDependencies = extractMockDependencies(description, assertions);
  }
  
  return {
    testCase: {
      name,
      description,
      type,
      assertions,
      mockDependencies
    },
    warnings
  };
}

/**
 * Extract JSON from AI response text
 * Handles markdown code blocks and plain JSON
 */
export function extractJsonFromResponse(responseText: string): string {
  // Try to extract from markdown code block
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Try to find JSON array directly
  const arrayMatch = responseText.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }
  
  // Return as-is
  return responseText.trim();
}

/**
 * Main extraction function
 * Parses AI response into TestCase objects with categorization
 * 
 * Requirements: 2.2, 2.4, 5.5
 */
export function extractTestCases(responseText: string): ExtractionResult {
  const warnings: string[] = [];
  
  try {
    const jsonText = extractJsonFromResponse(responseText);
    const parsed = JSON.parse(jsonText);
    
    if (!Array.isArray(parsed)) {
      return {
        testCases: [],
        warnings: ['Response is not an array of test cases']
      };
    }
    
    const testCases: TestCase[] = [];
    
    for (let i = 0; i < parsed.length; i++) {
      const { testCase, warnings: caseWarnings } = parseRawTestCase(parsed[i], i);
      testCases.push(testCase);
      warnings.push(...caseWarnings);
    }
    
    return { testCases, warnings };
    
  } catch (error) {
    return {
      testCases: [],
      warnings: [`Failed to parse response: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Categorize test cases by type
 * Requirement: 5.5
 */
export function categorizeTestCases(testCases: TestCase[]): Record<TestCaseType, TestCase[]> {
  const categorized: Record<TestCaseType, TestCase[]> = {
    happy_path: [],
    error: [],
    edge_case: [],
    boundary: []
  };
  
  for (const testCase of testCases) {
    categorized[testCase.type].push(testCase);
  }
  
  return categorized;
}

/**
 * Ensure minimum coverage for each category
 * Returns suggestions for missing categories
 */
export function checkCoverage(testCases: TestCase[]): string[] {
  const suggestions: string[] = [];
  const categorized = categorizeTestCases(testCases);
  
  if (categorized.happy_path.length === 0) {
    suggestions.push('Consider adding happy path test cases for normal successful operations');
  }
  
  if (categorized.error.length === 0) {
    suggestions.push('Consider adding error test cases for failure scenarios');
  }
  
  if (categorized.edge_case.length === 0) {
    suggestions.push('Consider adding edge case tests for boundary conditions');
  }
  
  return suggestions;
}
