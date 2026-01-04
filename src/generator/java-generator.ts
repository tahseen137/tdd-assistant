/**
 * Java Test Generator
 * Generates JUnit 5 test code for Java/Spring Boot
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3
 */

import { TestCase } from '../ai/openai-service';
import { TDDAssistantConfig, NamingConvention } from '../config/loader';
import { CodeFormatter, createCodeFormatter, organizeImports } from './code-formatter';

export interface TestMethod {
  name: string;
  annotations: string[];
  body: string;
  comment: string;
}

export interface GeneratedTest {
  className: string;
  packageName: string;
  imports: string[];
  testMethods: TestMethod[];
  sourceCode: string;
}

/**
 * Standard JUnit 5 imports
 * Requirement: 3.1
 */
const JUNIT5_IMPORTS = [
  'org.junit.jupiter.api.Test',
  'org.junit.jupiter.api.BeforeEach',
  'org.junit.jupiter.api.AfterEach',
  'org.junit.jupiter.api.DisplayName',
  'static org.junit.jupiter.api.Assertions.*'
];

/**
 * Spring Boot test imports
 * Requirement: 3.2
 */
const SPRING_BOOT_IMPORTS = [
  'org.springframework.boot.test.context.SpringBootTest',
  'org.springframework.boot.test.mock.mockito.MockBean',
  'org.springframework.beans.factory.annotation.Autowired'
];

/**
 * Mockito imports
 * Requirement: 3.4
 */
const MOCKITO_IMPORTS = [
  'org.mockito.Mock',
  'org.mockito.InjectMocks',
  'org.mockito.junit.jupiter.MockitoExtension',
  'org.junit.jupiter.api.extension.ExtendWith',
  'static org.mockito.Mockito.*'
];

/**
 * Converts a string to PascalCase for class names
 */
export function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Converts a string to camelCase for method names
 */
export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}


/**
 * Generates a test method name based on the naming convention
 * Requirement: 3.3
 */
export function generateMethodName(
  testCase: TestCase,
  convention: NamingConvention
): string {
  const description = testCase.description || testCase.name;
  
  switch (convention) {
    case 'should':
      return generateShouldName(description);
    case 'given_when_then':
      return generateGivenWhenThenName(description);
    case 'test':
      return generateTestName(description);
    default:
      return generateShouldName(description);
  }
}

/**
 * Generates a 'should' style method name
 * Format: should[Behavior]When[Condition]
 */
export function generateShouldName(description: string): string {
  // Clean and normalize the description
  const cleaned = description
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  
  // Check if description already starts with 'should'
  if (cleaned.toLowerCase().startsWith('should')) {
    return toCamelCase(cleaned);
  }
  
  // Try to extract condition with 'when' or 'if'
  const whenMatch = cleaned.match(/(.+?)\s+(?:when|if)\s+(.+)/i);
  if (whenMatch) {
    const behavior = toPascalCase(whenMatch[1]);
    const condition = toPascalCase(whenMatch[2]);
    return `should${behavior}When${condition}`;
  }
  
  // Default: just prefix with 'should'
  return `should${toPascalCase(cleaned)}`;
}

/**
 * Generates a 'given_when_then' style method name
 * Format: given[State]_when[Action]_then[Result]
 */
export function generateGivenWhenThenName(description: string): string {
  const cleaned = description
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  
  // Try to parse given/when/then from description
  const givenMatch = cleaned.match(/given\s+(.+?)\s+when\s+(.+?)\s+then\s+(.+)/i);
  if (givenMatch) {
    const given = toPascalCase(givenMatch[1]);
    const when = toPascalCase(givenMatch[2]);
    const then = toPascalCase(givenMatch[3]);
    return `given${given}_when${when}_then${then}`;
  }
  
  // Try to extract parts from natural language
  const whenThenMatch = cleaned.match(/(.+?)\s+(?:when|if)\s+(.+)/i);
  if (whenThenMatch) {
    const result = toPascalCase(whenThenMatch[1]);
    const action = toPascalCase(whenThenMatch[2]);
    return `givenValidInput_when${action}_then${result}`;
  }
  
  // Default: create a basic structure
  const pascalDesc = toPascalCase(cleaned);
  return `givenValidInput_whenAction_then${pascalDesc}`;
}

/**
 * Generates a 'test' style method name
 * Format: test[Behavior]
 */
export function generateTestName(description: string): string {
  const cleaned = description
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();
  
  // Check if already starts with 'test'
  if (cleaned.toLowerCase().startsWith('test')) {
    return toCamelCase(cleaned);
  }
  
  return `test${toPascalCase(cleaned)}`;
}


/**
 * Determines if Spring Boot annotations are needed
 * Requirement: 3.2
 */
export function needsSpringBootAnnotations(testCases: TestCase[]): boolean {
  // Check if any test case has mock dependencies that suggest Spring context
  const springIndicators = [
    'repository', 'service', 'controller', 'component',
    'autowired', 'bean', 'spring', 'rest'
  ];
  
  for (const testCase of testCases) {
    for (const dep of testCase.mockDependencies) {
      const lowerDep = dep.toLowerCase();
      if (springIndicators.some(indicator => lowerDep.includes(indicator))) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Determines if Mockito is needed
 * Requirement: 3.4
 */
export function needsMockito(testCases: TestCase[]): boolean {
  return testCases.some(tc => tc.mockDependencies && tc.mockDependencies.length > 0);
}

/**
 * Generates the imports section
 * Requirements: 3.1, 3.2, 3.4, 6.3
 */
export function generateImports(
  testCases: TestCase[],
  useSpringBoot: boolean
): string[] {
  const imports: string[] = [...JUNIT5_IMPORTS];
  
  if (useSpringBoot) {
    imports.push(...SPRING_BOOT_IMPORTS);
  }
  
  if (needsMockito(testCases)) {
    imports.push(...MOCKITO_IMPORTS);
  }
  
  // Organize imports following Java conventions
  // Requirement 6.3: Organize imports at the top of the file
  return organizeImports(imports);
}

/**
 * Generates a single test method
 * Requirements: 3.1, 3.5
 */
export function generateTestMethod(
  testCase: TestCase,
  convention: NamingConvention
): TestMethod {
  const methodName = generateMethodName(testCase, convention);
  
  const annotations = ['@Test'];
  if (testCase.description) {
    annotations.push(`@DisplayName("${escapeJavaString(testCase.description)}")`);
  }
  
  // Generate method body with fail() call
  // Requirement: 3.5
  const bodyLines: string[] = [];
  
  // Add TODO comments for assertions
  if (testCase.assertions && testCase.assertions.length > 0) {
    bodyLines.push('// TODO: Implement test');
    bodyLines.push('// Expected assertions:');
    for (const assertion of testCase.assertions) {
      bodyLines.push(`//   - ${assertion}`);
    }
    bodyLines.push('');
  }
  
  // Add fail() call to make test fail initially
  bodyLines.push('fail("Not implemented yet");');
  
  const body = bodyLines.join('\n        ');
  
  // Generate comment
  const comment = generateTestComment(testCase);
  
  return {
    name: methodName,
    annotations,
    body,
    comment
  };
}

/**
 * Escapes special characters for Java strings
 */
export function escapeJavaString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Generates a descriptive comment for a test method
 * Requirement: 6.2
 */
export function generateTestComment(testCase: TestCase): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(` * Test: ${testCase.description || testCase.name}`);
  lines.push(` * Type: ${testCase.type}`);
  
  if (testCase.mockDependencies && testCase.mockDependencies.length > 0) {
    lines.push(` * Mocks: ${testCase.mockDependencies.join(', ')}`);
  }
  
  lines.push(' */');
  return lines.join('\n');
}


/**
 * Generates mock field declarations
 * Requirement: 3.4
 */
export function generateMockFields(
  testCases: TestCase[],
  useSpringBoot: boolean
): string[] {
  // Collect unique mock dependencies
  const mockDeps = new Set<string>();
  for (const testCase of testCases) {
    if (testCase.mockDependencies) {
      for (const dep of testCase.mockDependencies) {
        mockDeps.add(dep);
      }
    }
  }
  
  if (mockDeps.size === 0) {
    return [];
  }
  
  const fields: string[] = [];
  const annotation = useSpringBoot ? '@MockBean' : '@Mock';
  
  for (const dep of mockDeps) {
    const fieldName = toCamelCase(dep);
    fields.push(`${annotation}`);
    fields.push(`private ${dep} ${fieldName};`);
    fields.push('');
  }
  
  return fields;
}

/**
 * Generates class-level annotations
 * Requirements: 3.2, 3.4
 */
export function generateClassAnnotations(
  testCases: TestCase[],
  useSpringBoot: boolean
): string[] {
  const annotations: string[] = [];
  
  if (useSpringBoot) {
    annotations.push('@SpringBootTest');
  }
  
  if (needsMockito(testCases) && !useSpringBoot) {
    annotations.push('@ExtendWith(MockitoExtension.class)');
  }
  
  return annotations;
}

/**
 * Generates the complete test class source code
 * Requirements: 3.1, 3.2, 3.4, 3.5, 6.1, 6.2, 6.3
 */
export function generateSourceCode(
  className: string,
  packageName: string,
  imports: string[],
  classAnnotations: string[],
  mockFields: string[],
  testMethods: TestMethod[]
): string {
  const lines: string[] = [];
  
  // Package declaration
  lines.push(`package ${packageName};`);
  lines.push('');
  
  // Imports (organized at top)
  // Requirement: 6.3
  for (const imp of imports) {
    if (imp.startsWith('static ')) {
      lines.push(`import ${imp};`);
    } else {
      lines.push(`import ${imp};`);
    }
  }
  lines.push('');
  
  // Class annotations
  for (const annotation of classAnnotations) {
    lines.push(annotation);
  }
  
  // Class declaration
  lines.push(`class ${className} {`);
  lines.push('');
  
  // Mock fields
  // Requirement: 6.1 - proper indentation (4 spaces)
  if (mockFields.length > 0) {
    for (const field of mockFields) {
      if (field) {
        lines.push(`    ${field}`);
      } else {
        lines.push('');
      }
    }
  }
  
  // Test methods
  for (const method of testMethods) {
    // Comment
    // Requirement: 6.2
    const commentLines = method.comment.split('\n');
    for (const commentLine of commentLines) {
      lines.push(`    ${commentLine}`);
    }
    
    // Annotations
    for (const annotation of method.annotations) {
      lines.push(`    ${annotation}`);
    }
    
    // Method signature and body
    lines.push(`    void ${method.name}() {`);
    const bodyLines = method.body.split('\n');
    for (const bodyLine of bodyLines) {
      lines.push(`        ${bodyLine}`);
    }
    lines.push('    }');
    lines.push('');
  }
  
  // Close class
  lines.push('}');
  
  return lines.join('\n');
}


/**
 * Derives a class name from a feature description
 */
export function deriveClassName(feature: string): string {
  const pascal = toPascalCase(feature);
  // Ensure it ends with 'Test'
  if (pascal.endsWith('Test')) {
    return pascal;
  }
  return `${pascal}Test`;
}

/**
 * TestGenerator class - main entry point for generating tests
 * Implements the TestGenerator interface from the design document
 */
export class JavaTestGenerator {
  private formatter: CodeFormatter;
  
  constructor() {
    this.formatter = createCodeFormatter();
  }
  
  /**
   * Generates a complete test class from test cases
   * Requirements: 3.1, 3.2, 3.4, 3.5
   */
  generate(
    testCases: TestCase[],
    config: TDDAssistantConfig,
    className?: string
  ): GeneratedTest {
    const finalClassName = className || 'GeneratedTest';
    const useSpringBoot = needsSpringBootAnnotations(testCases);
    
    // Generate imports
    const imports = generateImports(testCases, useSpringBoot);
    
    // Generate class annotations
    const classAnnotations = generateClassAnnotations(testCases, useSpringBoot);
    
    // Generate mock fields
    const mockFields = generateMockFields(testCases, useSpringBoot);
    
    // Generate test methods
    const testMethods = testCases.map(tc => 
      generateTestMethod(tc, config.testNamingConvention)
    );
    
    // Generate source code
    const sourceCode = generateSourceCode(
      finalClassName,
      config.packageName,
      imports,
      classAnnotations,
      mockFields,
      testMethods
    );
    
    return {
      className: finalClassName,
      packageName: config.packageName,
      imports,
      testMethods,
      sourceCode
    };
  }
  
  /**
   * Formats Java code with consistent indentation
   * Requirements: 6.1, 6.2, 6.3
   */
  formatCode(code: string): string {
    return this.formatter.format(code);
  }
  
  /**
   * Validates that code meets formatting requirements
   * Requirements: 6.1, 6.2, 6.3
   */
  validateFormatting(code: string): { isValid: boolean; errors: string[] } {
    return this.formatter.validate(code);
  }
}

/**
 * Factory function to create a JavaTestGenerator instance
 */
export function createJavaTestGenerator(): JavaTestGenerator {
  return new JavaTestGenerator();
}
