/**
 * Property-based tests for Code Formatter
 * Feature: tdd-assistant
 * 
 * Property 7: Code Formatting Consistency
 * Validates: Requirements 6.1, 6.2, 6.3
 */

import * as fc from 'fast-check';
import {
  CodeFormatter,
  createCodeFormatter,
  organizeImports,
  categorizeImport,
  ImportCategory,
  validateImportsAtTop,
  validateIndentation,
  validateTestComments,
  createIndent,
  DEFAULT_FORMATTER_CONFIG
} from './code-formatter';
import { JavaTestGenerator, createJavaTestGenerator } from './java-generator';
import { TestCase, TestCaseType } from '../ai/openai-service';
import { TDDAssistantConfig, NamingConvention } from '../config/loader';

/**
 * Arbitrary generator for TestCaseType
 */
const testCaseTypeArb = fc.constantFrom<TestCaseType>(
  'happy_path',
  'error',
  'edge_case',
  'boundary'
);

/**
 * Arbitrary generator for valid test case names (alphanumeric)
 */
const validNameArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')),
  { minLength: 3, maxLength: 50 }
).filter(s => s.trim().length >= 3);

/**
 * Arbitrary generator for mock dependency names
 */
const mockDependencyArb = fc.constantFrom(
  'UserRepository',
  'UserService',
  'EmailService',
  'PaymentGateway',
  'NotificationService'
);

/**
 * Arbitrary generator for assertions
 */
const assertionArb = fc.constantFrom(
  'response status is 200',
  'returned value is not null',
  'list size equals expected',
  'exception is thrown'
);

/**
 * Arbitrary generator for TestCase
 */
const testCaseArb = fc.record({
  name: validNameArb,
  description: validNameArb,
  type: testCaseTypeArb,
  assertions: fc.array(assertionArb, { minLength: 0, maxLength: 3 }),
  mockDependencies: fc.array(mockDependencyArb, { minLength: 0, maxLength: 3 })
});

/**
 * Arbitrary generator for naming conventions
 */
const namingConventionArb = fc.constantFrom<NamingConvention>(
  'should',
  'given_when_then',
  'test'
);

/**
 * Arbitrary generator for Java import statements
 */
const javaImportArb = fc.constantFrom(
  'java.util.List',
  'java.util.Map',
  'java.util.ArrayList',
  'javax.validation.Valid',
  'javax.persistence.Entity',
  'org.junit.jupiter.api.Test',
  'org.springframework.boot.test.context.SpringBootTest',
  'org.mockito.Mock',
  'com.example.service.UserService',
  'com.example.repository.UserRepository',
  'static org.junit.jupiter.api.Assertions.*',
  'static org.mockito.Mockito.*'
);

/**
 * Create a default config for testing
 */
function createTestConfig(convention: NamingConvention = 'should'): TDDAssistantConfig {
  return {
    packageName: 'com.example.test',
    outputDirectory: 'src/test/java',
    testNamingConvention: convention,
    aiModel: 'gpt-4',
    apiKey: 'test-key',
    springBootVersion: '3.x'
  };
}

describe('CodeFormatter', () => {
  const formatter = createCodeFormatter();
  const generator = createJavaTestGenerator();


  describe('Property 7: Code Formatting Consistency', () => {
    /**
     * Property 7: Code Formatting Consistency
     * For any generated Java code:
     * - Imports should appear at the top of the file before the class declaration
     * - Each test method should have a descriptive comment
     * - Indentation should be consistent (4 spaces per level)
     * 
     * Validates: Requirements 6.1, 6.2, 6.3
     */

    /**
     * Property 7.1: Imports appear at top of file
     * Requirement 6.3: Organize imports at the top of the file following Java conventions
     */
    it('should have imports at the top of the file before class declaration', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Validate imports are at top
            expect(validateImportsAtTop(result.sourceCode)).toBe(true);
            
            // Additional check: package comes first, then imports, then class
            const lines = result.sourceCode.split('\n');
            let packageIndex = -1;
            let firstImportIndex = -1;
            let lastImportIndex = -1;
            let classIndex = -1;
            
            for (let i = 0; i < lines.length; i++) {
              const trimmed = lines[i].trim();
              if (trimmed.startsWith('package ') && packageIndex === -1) {
                packageIndex = i;
              }
              if (trimmed.startsWith('import ')) {
                if (firstImportIndex === -1) firstImportIndex = i;
                lastImportIndex = i;
              }
              if (trimmed.startsWith('class ') || trimmed.startsWith('@SpringBootTest')) {
                if (classIndex === -1) classIndex = i;
              }
            }
            
            // Package should come before imports
            if (packageIndex !== -1 && firstImportIndex !== -1) {
              expect(packageIndex).toBeLessThan(firstImportIndex);
            }
            
            // Imports should come before class
            if (lastImportIndex !== -1 && classIndex !== -1) {
              expect(lastImportIndex).toBeLessThan(classIndex);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.2: Each test method has a descriptive comment
     * Requirement 6.2: Include meaningful comments explaining each test's purpose
     */
    it('should have descriptive comment for each test method', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Validate test comments exist
            expect(validateTestComments(result.sourceCode)).toBe(true);
            
            // Each test method in result should have a comment
            for (const method of result.testMethods) {
              expect(method.comment).toBeDefined();
              expect(method.comment.length).toBeGreaterThan(0);
              expect(method.comment).toContain('/**');
              expect(method.comment).toContain('*/');
              expect(method.comment).toContain('Test:');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 7.3: Consistent 4-space indentation
     * Requirement 6.1: Generate properly indented Java code
     * 
     * Note: Javadoc comment lines have base indentation + 1 space for asterisk alignment
     */
    it('should have consistent 4-space indentation', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Validate indentation
            expect(validateIndentation(result.sourceCode)).toBe(true);
            
            // Check specific indentation patterns
            const lines = result.sourceCode.split('\n');
            for (const line of lines) {
              if (line.length === 0) continue;
              
              const leadingSpaces = line.match(/^(\s*)/)?.[1] || '';
              const trimmed = line.trim();
              
              // Javadoc comment lines have base indentation + 1 for asterisk
              if (trimmed.startsWith('*')) {
                const adjustedLength = leadingSpaces.length - 1;
                expect(adjustedLength >= 0 && adjustedLength % 4 === 0).toBe(true);
              } else if (leadingSpaces.length > 0) {
                // Regular lines should have indentation as multiple of 4
                expect(leadingSpaces.length % 4).toBe(0);
              }
              
              // Should not contain tabs
              expect(leadingSpaces).not.toContain('\t');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Import Organization', () => {
    /**
     * Test that imports are organized following Java conventions
     * Order: java.* → javax.* → org.* → com.* → other → static
     */
    it('should organize imports in correct order', () => {
      fc.assert(
        fc.property(
          fc.array(javaImportArb, { minLength: 2, maxLength: 10 }),
          (imports) => {
            const uniqueImports = [...new Set(imports)];
            const organized = organizeImports(uniqueImports);
            
            // Verify order: java < javax < org < com < static
            let lastCategory: ImportCategory | null = null;
            const categoryOrder = [
              ImportCategory.JAVA,
              ImportCategory.JAVAX,
              ImportCategory.ORG,
              ImportCategory.COM,
              ImportCategory.OTHER,
              ImportCategory.STATIC
            ];
            
            for (const imp of organized) {
              const category = categorizeImport(imp);
              
              if (lastCategory !== null && lastCategory !== category) {
                const lastIndex = categoryOrder.indexOf(lastCategory);
                const currentIndex = categoryOrder.indexOf(category);
                expect(currentIndex).toBeGreaterThanOrEqual(lastIndex);
              }
              
              lastCategory = category;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should categorize imports correctly', () => {
      expect(categorizeImport('java.util.List')).toBe(ImportCategory.JAVA);
      expect(categorizeImport('javax.validation.Valid')).toBe(ImportCategory.JAVAX);
      expect(categorizeImport('org.junit.jupiter.api.Test')).toBe(ImportCategory.ORG);
      expect(categorizeImport('com.example.Service')).toBe(ImportCategory.COM);
      expect(categorizeImport('static org.mockito.Mockito.*')).toBe(ImportCategory.STATIC);
    });
  });

  describe('Indentation Utilities', () => {
    it('should create correct indent string', () => {
      expect(createIndent(0)).toBe('');
      expect(createIndent(1)).toBe('    ');
      expect(createIndent(2)).toBe('        ');
      expect(createIndent(3)).toBe('            ');
    });

    it('should respect custom indent configuration', () => {
      const customConfig = { indentSize: 2, indentChar: ' ' as const };
      expect(createIndent(1, customConfig)).toBe('  ');
      expect(createIndent(2, customConfig)).toBe('    ');
    });
  });

  describe('Validation Functions', () => {
    it('should validate imports at top correctly', () => {
      const validCode = `package com.example;

import org.junit.jupiter.api.Test;

class TestClass {
}`;
      expect(validateImportsAtTop(validCode)).toBe(true);

      const invalidCode = `class TestClass {
}

import org.junit.jupiter.api.Test;`;
      expect(validateImportsAtTop(invalidCode)).toBe(false);
    });

    it('should validate indentation correctly', () => {
      const validCode = `package com.example;

class TestClass {
    void method() {
        // body
    }
}`;
      expect(validateIndentation(validCode)).toBe(true);

      const invalidCode = `package com.example;

class TestClass {
   void method() {
        // body
    }
}`;
      expect(validateIndentation(invalidCode)).toBe(false);
    });

    it('should validate test comments correctly', () => {
      const validCode = `class TestClass {
    /**
     * Test: description
     */
    @Test
    void testMethod() {
    }
}`;
      expect(validateTestComments(validCode)).toBe(true);

      const invalidCode = `class TestClass {
    @Test
    void testMethod() {
    }
}`;
      expect(validateTestComments(invalidCode)).toBe(false);
    });
  });

  describe('CodeFormatter class', () => {
    it('should format code and maintain validity', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 3 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Format the code
            const formatted = formatter.format(result.sourceCode);
            
            // Formatted code should still be valid
            const validation = formatter.validate(formatted);
            expect(validation.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return correct config', () => {
      const config = formatter.getConfig();
      expect(config.indentSize).toBe(4);
      expect(config.indentChar).toBe(' ');
    });
  });
});
