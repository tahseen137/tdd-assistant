/**
 * Property-based tests for Java Test Generator
 * Feature: tdd-assistant
 * 
 * Property 3: Generated Test Structure Validity
 * Validates: Requirements 3.1, 3.4, 3.5
 * 
 * Property 4: Test Method Naming Convention Compliance
 * Validates: Requirements 3.3
 */

import * as fc from 'fast-check';
import {
  JavaTestGenerator,
  createJavaTestGenerator,
  generateMethodName,
  generateShouldName,
  generateGivenWhenThenName,
  generateTestName,
  toPascalCase,
  toCamelCase
} from './java-generator';
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
  'NotificationService',
  'AuthenticationService',
  'CacheService',
  'DatabaseConnection'
);

/**
 * Arbitrary generator for assertions
 */
const assertionArb = fc.constantFrom(
  'response status is 200',
  'returned value is not null',
  'list size equals expected',
  'exception is thrown',
  'method was called once',
  'result matches expected'
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
 * Arbitrary generator for TestCase with mock dependencies
 */
const testCaseWithMocksArb = fc.record({
  name: validNameArb,
  description: validNameArb,
  type: testCaseTypeArb,
  assertions: fc.array(assertionArb, { minLength: 1, maxLength: 3 }),
  mockDependencies: fc.array(mockDependencyArb, { minLength: 1, maxLength: 3 })
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

describe('JavaTestGenerator', () => {
  const generator = createJavaTestGenerator();

  describe('Property 3: Generated Test Structure Validity', () => {
    /**
     * Property 3: Generated Test Structure Validity
     * For any set of test cases, the generated Java code should:
     * - Contain JUnit 5 @Test annotations
     * - Include a fail("Not implemented yet") call in each test method
     * - Have exactly one test method per test case
     * - Include Mockito imports when dependencies are present
     * 
     * Validates: Requirements 3.1, 3.4, 3.5
     */
    it('should contain @Test annotation for each test case', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Count @Test annotations in source code
            const testAnnotationCount = (result.sourceCode.match(/@Test/g) || []).length;
            
            // Should have exactly one @Test per test case
            expect(testAnnotationCount).toBe(testCases.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include fail("Not implemented yet") in each test method', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Count fail() calls in source code
            const failCallCount = (result.sourceCode.match(/fail\("Not implemented yet"\)/g) || []).length;
            
            // Should have exactly one fail() per test case
            expect(failCallCount).toBe(testCases.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have exactly one test method per test case', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // testMethods array should have same length as input
            expect(result.testMethods.length).toBe(testCases.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include Mockito imports when dependencies are present', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseWithMocksArb, { minLength: 1, maxLength: 3 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Should include Mockito imports
            expect(result.sourceCode).toContain('import org.mockito');
            expect(result.sourceCode).toContain('import static org.mockito.Mockito.*');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include JUnit 5 imports', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 1, maxLength: 3 }),
          namingConventionArb,
          (testCases, convention) => {
            const config = createTestConfig(convention);
            const result = generator.generate(testCases, config, 'TestClass');
            
            // Should include JUnit 5 imports
            expect(result.sourceCode).toContain('import org.junit.jupiter.api.Test');
            expect(result.sourceCode).toContain('import static org.junit.jupiter.api.Assertions.*');
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 4: Test Method Naming Convention Compliance', () => {
    /**
     * Property 4: Test Method Naming Convention Compliance
     * For any generated test method and configured naming convention, the method name should match the pattern:
     * - 'should' convention: should[Behavior]When[Condition] or should[Behavior]
     * - 'given_when_then' convention: given[State]_when[Action]_then[Result]
     * - 'test' convention: test[Behavior]
     * 
     * Validates: Requirements 3.3
     */
    it('should generate method names starting with "should" for should convention', () => {
      fc.assert(
        fc.property(
          testCaseArb,
          (testCase) => {
            const methodName = generateMethodName(testCase, 'should');
            
            // Method name should start with 'should'
            expect(methodName.startsWith('should')).toBe(true);
            
            // Method name should be valid Java identifier (camelCase, no spaces)
            expect(methodName).toMatch(/^[a-z][a-zA-Z0-9]*$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate method names with given_when_then pattern for given_when_then convention', () => {
      fc.assert(
        fc.property(
          testCaseArb,
          (testCase) => {
            const methodName = generateMethodName(testCase, 'given_when_then');
            
            // Method name should contain 'given', 'when', and 'then' with underscores
            expect(methodName).toContain('given');
            expect(methodName).toContain('_when');
            expect(methodName).toContain('_then');
            
            // Method name should be valid Java identifier
            expect(methodName).toMatch(/^[a-z][a-zA-Z0-9_]*$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate method names starting with "test" for test convention', () => {
      fc.assert(
        fc.property(
          testCaseArb,
          (testCase) => {
            const methodName = generateMethodName(testCase, 'test');
            
            // Method name should start with 'test'
            expect(methodName.startsWith('test')).toBe(true);
            
            // Method name should be valid Java identifier
            expect(methodName).toMatch(/^[a-z][a-zA-Z0-9]*$/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate unique method names for different test cases', () => {
      fc.assert(
        fc.property(
          fc.array(testCaseArb, { minLength: 2, maxLength: 5 }),
          namingConventionArb,
          (testCases, convention) => {
            // Ensure test cases have unique descriptions
            const uniqueTestCases = testCases.map((tc, i) => ({
              ...tc,
              description: `${tc.description} ${i}`
            }));
            
            const methodNames = uniqueTestCases.map(tc => 
              generateMethodName(tc, convention)
            );
            
            // All method names should be non-empty
            methodNames.forEach(name => {
              expect(name.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit tests for helper functions', () => {
    describe('toPascalCase', () => {
      it('should convert simple string to PascalCase', () => {
        expect(toPascalCase('hello world')).toBe('HelloWorld');
      });

      it('should handle single word', () => {
        expect(toPascalCase('hello')).toBe('Hello');
      });

      it('should handle special characters', () => {
        expect(toPascalCase('hello-world_test')).toBe('HelloWorldTest');
      });
    });

    describe('toCamelCase', () => {
      it('should convert simple string to camelCase', () => {
        expect(toCamelCase('hello world')).toBe('helloWorld');
      });

      it('should handle single word', () => {
        expect(toCamelCase('Hello')).toBe('hello');
      });
    });

    describe('generateShouldName', () => {
      it('should generate name starting with should', () => {
        const name = generateShouldName('return user when valid id');
        expect(name.startsWith('should')).toBe(true);
      });

      it('should handle description with when clause', () => {
        const name = generateShouldName('return error when invalid input');
        expect(name).toContain('When');
      });
    });

    describe('generateGivenWhenThenName', () => {
      it('should generate name with given_when_then pattern', () => {
        const name = generateGivenWhenThenName('user is logged in');
        expect(name).toContain('given');
        expect(name).toContain('_when');
        expect(name).toContain('_then');
      });
    });

    describe('generateTestName', () => {
      it('should generate name starting with test', () => {
        const name = generateTestName('user registration');
        expect(name.startsWith('test')).toBe(true);
      });
    });
  });

  describe('Unit tests for generator', () => {
    it('should generate valid Java class structure', () => {
      const testCases: TestCase[] = [{
        name: 'testUserLogin',
        description: 'Test user login functionality',
        type: 'happy_path',
        assertions: ['user is logged in'],
        mockDependencies: []
      }];
      
      const config = createTestConfig();
      const result = generator.generate(testCases, config, 'UserLoginTest');
      
      expect(result.className).toBe('UserLoginTest');
      expect(result.packageName).toBe('com.example.test');
      expect(result.sourceCode).toContain('package com.example.test;');
      expect(result.sourceCode).toContain('class UserLoginTest {');
    });

    it('should include @SpringBootTest when Spring dependencies detected', () => {
      const testCases: TestCase[] = [{
        name: 'testUserService',
        description: 'Test user service',
        type: 'happy_path',
        assertions: ['service returns user'],
        mockDependencies: ['UserRepository', 'UserService']
      }];
      
      const config = createTestConfig();
      const result = generator.generate(testCases, config, 'UserServiceTest');
      
      expect(result.sourceCode).toContain('@SpringBootTest');
      expect(result.sourceCode).toContain('@MockBean');
    });

    it('should include @DisplayName annotation with description', () => {
      const testCases: TestCase[] = [{
        name: 'testFeature',
        description: 'Verify feature works correctly',
        type: 'happy_path',
        assertions: [],
        mockDependencies: []
      }];
      
      const config = createTestConfig();
      const result = generator.generate(testCases, config, 'FeatureTest');
      
      expect(result.sourceCode).toContain('@DisplayName("Verify feature works correctly")');
    });
  });
});
